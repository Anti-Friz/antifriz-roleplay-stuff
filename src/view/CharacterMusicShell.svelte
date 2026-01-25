<svelte:options accessors={true}/>

<script>
   /**
    * MusicShell - Manage soundtrack/themes for Actors or Items
    * Compact design with inline controls and header volume slider
    * 
    * Broadcast system:
    * - GM selects broadcast targets (all players, specific players, or none)
    * - When GM plays/pauses/stops - it syncs to selected targets
    * - Two volume controls: GM volume (local) and Player volume (broadcast)
    */
   import { getContext, onMount, onDestroy } from 'svelte';
   import { ApplicationShell } from '#runtime/svelte/component/application';
   import { MODULE_ID, DEFAULT_MUSIC_CATEGORIES, UNCATEGORIZED_CATEGORY } from '#config';
   import { canUserSee, getOnlinePlayers, getAllPlayers, confirmDelete, promptRename, openAudioPicker, getFilenameFromPath } from '#utils';
   import PermissionPicker from './components/PermissionPicker.svelte';
   
   export let elementRoot = void 0;
   export let tjsDoc = null;
   
   const external = getContext('#external');
   const application = external?.application;
   
   $: doc = tjsDoc ? $tjsDoc : null;
   
   // Track state
   let tracks = [];
   let currentTrackId = null;
   
   $: if (doc) {
      tracks = doc.getFlag(MODULE_ID, 'music.tracks') ?? [];
      currentTrackId = doc.getFlag(MODULE_ID, 'music.currentTrack') ?? null;
   }
   
   $: currentTrack = tracks.find(t => t.id === currentTrackId);
   
   // Filter tracks based on permissions (GM sees all)
   $: visibleTracks = tracks.filter(t => canUserSee(t.ownership, game.user, doc));

   
   // Audio state
   let audioElement = null;
   let isPlaying = false;
   let gmVolume = 0.5;        // GM's local volume
   let playerVolume = 0.5;    // Volume for players (broadcast)
   let currentTime = 0;
   let duration = 0;
   
   // Broadcast state - target selection instead of on/off
   // UI state
   let broadcastMenuOpen = false;
   
   // 'none' | 'all' | string[] (specific user IDs)
   let broadcastTarget = 'none';
   let syncInterval = null;
   
   $: isGM = game.user.isGM;
   $: isBroadcasting = broadcastTarget !== 'none';
   
   // Categories from settings (with fallback from config)
   $: categories = game.settings.get(MODULE_ID, 'musicCategories') ?? DEFAULT_MUSIC_CATEGORIES;
   $: categoryIds = new Set(categories.map(c => c.id));
   
   // Group tracks by category, putting invalid categories in "Uncategorized"
   // Uses visibleTracks (filtered by permissions) instead of all tracks
   $: groupedTracks = (() => {
      const groups = categories.map(cat => ({
         ...cat,
         tracks: visibleTracks.filter(t => (t.category || 'theme') === cat.id)
      })).filter(g => g.tracks.length > 0);
      
      // Find tracks with invalid categories
      const uncategorizedTracks = visibleTracks.filter(t => {
         const trackCat = t.category || 'theme';
         return !categoryIds.has(trackCat);
      });
      
      // Add uncategorized group if needed
      if (uncategorizedTracks.length > 0) {
         groups.push({
            ...UNCATEGORIZED_CATEGORY,
            tracks: uncategorizedTracks
         });
      }
      
      return groups;
   })();
   
   // Get broadcast target label for display
   $: broadcastTargetLabel = (() => {
      if (broadcastTarget === 'none') return 'Off';
      if (broadcastTarget === 'all') return 'All Players';
      if (Array.isArray(broadcastTarget)) {
         if (broadcastTarget.length === 0) return 'Off';
         if (broadcastTarget.length === 1) {
            const user = game.users.get(broadcastTarget[0]);
            return user?.name ?? '1 player';
         }
         return `${broadcastTarget.length} players`;
      }
      return 'Off';
   })();
   
   // Close broadcast menu when clicking outside
   function handleWindowClick(e) {
      if (broadcastMenuOpen && !e.target.closest('.broadcast-selector')) {
         broadcastMenuOpen = false;
      }
   }
   
   
   // ============================================
   // LIFECYCLE
   // ============================================
   
   onMount(() => {
      audioElement = new Audio();
      audioElement.volume = gmVolume;
      
      audioElement.addEventListener('play', handlePlay);
      audioElement.addEventListener('pause', handlePause);
      audioElement.addEventListener('ended', handleTrackEnded);
      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      audioElement.addEventListener('loadedmetadata', () => duration = audioElement.duration || 0);
   });
   
   onDestroy(() => {
      if (syncInterval) clearInterval(syncInterval);
      if (audioElement) {
         audioElement.pause();
         audioElement.src = '';
      }
      // Stop broadcast for players when closing
      if (isBroadcasting) {
         emitSocket('stopMusic', { actorName: doc?.name });
      }
   });
   
   function handlePlay() {
      isPlaying = true;
      // Sync to players if broadcasting
      if (isBroadcasting && currentTrack) {
         broadcastToTargets('playMusic', {
            path: currentTrack.path,
            name: currentTrack.name,
            actorName: doc.name,
            volume: playerVolume,
            currentTime: audioElement?.currentTime || 0
         });
         startSyncInterval();
      }
   }
   
   function handlePause() {
      isPlaying = false;
      // Sync pause to players
      if (isBroadcasting) {
         broadcastToTargets('pauseMusic', {
            actorName: doc.name
         });
      }
   }
   
   function handleTrackEnded() {
      isPlaying = false;
      currentTime = 0;
      // Stop for players too
      if (isBroadcasting) {
         broadcastToTargets('stopMusic', { actorName: doc.name });
         stopSyncInterval();
      }
   }
   
   function handleTimeUpdate() {
      currentTime = audioElement.currentTime;
      duration = audioElement.duration || 0;
   }
   
   // ============================================
   // TRACK MANAGEMENT
   // ============================================
   
   async function addTrack() {
      openAudioPicker(async (path) => {
         const newTrack = {
            id: foundry.utils.randomID(),
            name: getFilenameFromPath(path),
            path,
            category: 'theme'
         };
         await doc.setFlag(MODULE_ID, 'music.tracks', [...tracks, newTrack]);
      });
   }
   
   async function removeTrack(trackId) {
      const track = tracks.find(t => t.id === trackId);
      const confirmed = await confirmDelete('Remove Track', track?.name || 'this track');
      
      if (confirmed) {
         await doc.setFlag(MODULE_ID, 'music.tracks', tracks.filter(t => t.id !== trackId));
         if (currentTrackId === trackId) {
            stopTrack();
            await doc.setFlag(MODULE_ID, 'music.currentTrack', null);
         }
      }
   }
   
   async function renameTrack(track) {
      const newName = await promptRename('Rename Track', track.name);
      if (newName) {
         await doc.setFlag(MODULE_ID, 'music.tracks', 
            tracks.map(t => t.id === track.id ? { ...t, name: newName } : t)
         );
      }
   }
   
   async function setCategoryForTrack(track, category) {
      await doc.setFlag(MODULE_ID, 'music.tracks',
         tracks.map(t => t.id === track.id ? { ...t, category } : t)
      );
   }
   
   async function setTrackOwnership(track, ownership) {
      await doc.setFlag(MODULE_ID, 'music.tracks',
         tracks.map(t => t.id === track.id ? { ...t, ownership } : t)
      );
   }
   
   
   
   
   // ============================================
   // PLAYBACK CONTROLS
   // ============================================
   
   async function playTrack(track) {
      if (!audioElement) return;
      
      if (currentTrackId === track.id && isPlaying) {
         // Pause current track
         audioElement.pause();
      } else {
         // Play new/different track
         currentTrackId = track.id;
         audioElement.src = track.path;
         audioElement.play();
         await doc.setFlag(MODULE_ID, 'music.currentTrack', track.id);
      }
   }
   
   function stopTrack() {
      if (audioElement) {
         audioElement.pause();
         audioElement.currentTime = 0;
         isPlaying = false;
         currentTime = 0;
      }
      // Stop for players too
      if (isBroadcasting) {
         broadcastToTargets('stopMusic', { actorName: doc.name });
      }
   }
   
   function setGmVolume(e) {
      gmVolume = parseFloat(e.target.value);
      if (audioElement) audioElement.volume = gmVolume;
   }
   
   function setPlayerVolume(e) {
      playerVolume = parseFloat(e.target.value);
      // Send volume update to players if broadcasting
      if (isBroadcasting) {
         broadcastToTargets('setVolume', { volume: playerVolume });
      }
   }
   
   function seekTo(e, track) {
      if (!audioElement || currentTrackId !== track.id) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audioElement.currentTime = percent * duration;
      
      // Sync seek to players
      if (isBroadcasting) {
         broadcastToTargets('seekMusic', { 
            currentTime: audioElement.currentTime 
         });
      }
   }
   
   function formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
   }
   
   // ============================================
   // BROADCAST FUNCTIONS
   // ============================================
   
   function emitSocket(type, data) {
      game.socket.emit(`module.${MODULE_ID}`, {
         type,
         senderId: game.user.id,
         data
      });
   }
   
   /**
    * Send message to broadcast targets only
    */
   function broadcastToTargets(type, data) {
      if (broadcastTarget === 'none') return;
      
      const targetUsers = broadcastTarget === 'all' 
         ? undefined  // undefined means all non-GM users
         : broadcastTarget; // array of specific user IDs
      
      emitSocket(type, { ...data, targetUsers });
   }
   
   function startSyncInterval() {
      if (syncInterval) return;
      syncInterval = setInterval(syncPlaybackState, 5000);
   }
   
   function stopSyncInterval() {
      if (syncInterval) {
         clearInterval(syncInterval);
         syncInterval = null;
      }
   }
   
   function syncPlaybackState() {
      if (!isBroadcasting || !audioElement) return;
      broadcastToTargets('syncMusic', {
         currentTime: audioElement.currentTime,
         isPlaying
      });
   }
   
   /**
    * Set broadcast target
    * @param {'none' | 'all' | string[]} target
    */
   function setBroadcastTarget(target) {
      const wasPlaying = isPlaying && isBroadcasting;
      
      // If turning off broadcast, stop music for previous targets
      if (isBroadcasting && target === 'none') {
         broadcastToTargets('stopMusic', { actorName: doc.name });
         stopSyncInterval();
      }
      
      broadcastTarget = target;
      
      // If turning on broadcast while playing, start for new targets
      if (target !== 'none' && isPlaying && currentTrack) {
         broadcastToTargets('playMusic', {
            path: currentTrack.path,
            name: currentTrack.name,
            actorName: doc.name,
            volume: playerVolume,
            currentTime: audioElement?.currentTime || 0
         });
         startSyncInterval();
      }
   }
   
   function togglePlayerInBroadcast(userId) {
      if (broadcastTarget === 'none' || broadcastTarget === 'all') {
         // Start with just this player
         setBroadcastTarget([userId]);
      } else if (Array.isArray(broadcastTarget)) {
         if (broadcastTarget.includes(userId)) {
            // Remove player
            const newTargets = broadcastTarget.filter(id => id !== userId);
            setBroadcastTarget(newTargets.length > 0 ? newTargets : 'none');
         } else {
            // Add player
            setBroadcastTarget([...broadcastTarget, userId]);
         }
      }
   }
   
   function isPlayerInBroadcast(userId) {
      if (broadcastTarget === 'all') return true;
      if (Array.isArray(broadcastTarget)) return broadcastTarget.includes(userId);
      return false;
   }
</script>

<svelte:window on:click={handleWindowClick} />

<ApplicationShell bind:elementRoot>
   <main class="music-shell">
      <!-- Header with volume controls and add button -->
      <header class="music-header">
         <h2>
            <i class="fas fa-music"></i>
            {doc?.name ?? 'Document'}'s Music
         </h2>
         <div class="header-controls">
            <!-- GM Volume -->
            <div class="volume-control" title="Your Volume (GM)">
               <i class="fas fa-headphones"></i>
               <input type="range" min="0" max="1" step="0.05" value={gmVolume} on:input={setGmVolume} />
            </div>
            
            {#if isGM}
               <!-- Player Volume (only for GM) -->
               <div class="volume-control player-volume" title="Player Volume (Broadcast)">
                  <i class="fas fa-users"></i>
                  <input type="range" min="0" max="1" step="0.05" value={playerVolume} on:input={setPlayerVolume} />
               </div>
               
               <!-- Broadcast Target Selector -->
               <div class="broadcast-selector" class:open={broadcastMenuOpen}>
                  <button 
                     type="button" 
                     class="broadcast-toggle"
                     class:active={isBroadcasting}
                     title="Broadcast to: {broadcastTargetLabel}"
                     on:click={() => broadcastMenuOpen = !broadcastMenuOpen}
                  >
                     <i class="fas fa-broadcast-tower"></i>
                     {#if isBroadcasting}
                        <span class="broadcast-badge">{broadcastTargetLabel}</span>
                     {/if}
                  </button>
                  {#if broadcastMenuOpen}
                     <div class="broadcast-dropdown-menu">
                        <button type="button" class:selected={broadcastTarget === 'none'} on:click={() => setBroadcastTarget('none')}>
                           <i class="fas fa-times"></i> Off
                        </button>
                        <button type="button" class:selected={broadcastTarget === 'all'} on:click={() => setBroadcastTarget('all')}>
                           <i class="fas fa-globe"></i> All Players
                        </button>
                        <div class="dropdown-divider"></div>
                        {#each getOnlinePlayers() as player}
                           <button 
                              type="button" 
                              class:selected={isPlayerInBroadcast(player.id)}
                              on:click={() => togglePlayerInBroadcast(player.id)}
                           >
                              <i class="fas fa-{isPlayerInBroadcast(player.id) ? 'check-square' : 'square'}"></i>
                              <span style="color: {player.color}">{player.name}</span>
                           </button>
                        {/each}
                        {#if getOnlinePlayers().length === 0}
                           <span class="no-players">No players online</span>
                        {/if}
                     </div>
                  {/if}
               </div>
            {/if}
            
            <button type="button" class="add-btn" on:click={addTrack} title="Add Track">
               <i class="fas fa-plus"></i>
            </button>
         </div>
      </header>
      
      <!-- Now Playing indicator (compact) -->
      {#if currentTrack && isPlaying}
         <div class="now-playing-bar">
            <span class="np-title">{currentTrack.name}</span>
            <span class="np-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
            {#if isBroadcasting}
               <span class="broadcast-indicator">
                  <i class="fas fa-broadcast-tower"></i> {broadcastTargetLabel}
               </span>
            {/if}
         </div>
      {/if}
      
      <!-- Track List -->
      <div class="track-list">
         {#if visibleTracks.length === 0}
            <div class="empty-state">
               <i class="fas fa-music fa-3x"></i>
               {#if tracks.length === 0}
                  <p>No tracks added yet</p>
                  <p class="hint">Click + to add character music</p>
               {:else}
                  <p>No tracks visible</p>
                  <p class="hint">All tracks are hidden from you</p>
               {/if}
            </div>
         {:else}
            {#each groupedTracks as group}
               <div class="track-group">
                  <h3 class="group-title">
                     <i class="fas {group.icon}"></i>
                     {group.label}
                  </h3>
                  {#each group.tracks as track (track.id)}
                     {@const isCurrentTrack = currentTrackId === track.id}
                     {@const isTrackPlaying = isCurrentTrack && isPlaying}
                     {@const trackCategory = track.category || 'theme'}
                     {@const isValidCategory = categoryIds.has(trackCategory)}
                     <div class="track-item" class:playing={isTrackPlaying} class:selected={isCurrentTrack}>
                        <!-- Play/Pause button -->
                        <button type="button" class="play-btn" on:click={() => playTrack(track)}>
                           <i class="fas fa-{isTrackPlaying ? 'pause' : 'play'}"></i>
                        </button>
                        
                        <!-- Stop button -->
                        {#if isCurrentTrack}
                           <button type="button" class="stop-btn" on:click={stopTrack} title="Stop">
                              <i class="fas fa-stop"></i>
                           </button>
                        {/if}
                        
                        <!-- Track info -->
                        <div class="track-info">
                           <button type="button" class="track-name" on:dblclick={() => renameTrack(track)}>
                              {track.name}
                           </button>
                           
                           <!-- Progress bar (only for current track) -->
                           {#if isCurrentTrack && duration > 0}
                              <div class="track-progress" 
                                   on:click={(e) => seekTo(e, track)} 
                                   on:keydown={() => {}}
                                   role="slider" 
                                   tabindex="0"
                                   aria-valuenow={currentTime}>
                                 <div class="progress-fill" style="width: {(currentTime / duration * 100)}%"></div>
                              </div>
                           {/if}
                        </div>
                        
                        <!-- Actions -->
                        <div class="track-actions">
                           <select class="category-select" 
                              class:invalid={!isValidCategory}
                              value={trackCategory} 
                              on:change={(e) => setCategoryForTrack(track, e.target.value)}
                              title={!isValidCategory ? 'Category no longer exists - please select a new one' : ''}
                           >
                              {#if !isValidCategory}
                                 <option value={trackCategory} disabled>⚠️ {trackCategory} (invalid)</option>
                              {/if}
                              {#each categories as cat}
                                 <option value={cat.id}>{cat.label}</option>
                              {/each}
                           </select>
                           
                           {#if isGM}
                              <!-- Permission picker -->
                              <PermissionPicker 
                                 value={track.ownership}
                                 compact={true}
                                 on:change={(e) => setTrackOwnership(track, e.detail)}
                              />
                           {/if}
                           
                           <button type="button" class="delete-btn" on:click={() => removeTrack(track.id)} title="Remove">
                              <i class="fas fa-trash"></i>
                           </button>
                        </div>
                     </div>
                  {/each}
               </div>
            {/each}
         {/if}
      </div>
   </main>
</ApplicationShell>
