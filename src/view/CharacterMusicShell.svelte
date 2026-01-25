<svelte:options accessors={true}/>

<script>
   /**
    * MusicShell - Manage soundtrack/themes for Actors or Items
    * Compact design with inline controls and header volume slider
    */
   import { getContext, onMount, onDestroy } from 'svelte';
   import { ApplicationShell } from '#runtime/svelte/component/application';
   import { MODULE_ID } from '#config';
   
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
   
   // Audio state
   let audioElement = null;
   let isPlaying = false;
   let volume = 0.5;
   let currentTime = 0;
   let duration = 0;
   
   // Broadcast state
   let isBroadcasting = false;
   let syncInterval = null;
   
   $: isGM = game.user.isGM;
   
   // Categories
   const categories = [
      { id: 'theme', label: 'Theme', icon: 'fa-music' },
      { id: 'combat', label: 'Combat', icon: 'fa-swords' },
      { id: 'dramatic', label: 'Dramatic', icon: 'fa-theater-masks' },
      { id: 'ambient', label: 'Ambient', icon: 'fa-wind' }
   ];
   
   $: groupedTracks = categories.map(cat => ({
      ...cat,
      tracks: tracks.filter(t => (t.category || 'theme') === cat.id)
   })).filter(g => g.tracks.length > 0);
   
   $: onlinePlayers = game.users.filter(u => u.active && !u.isGM);
   
   // ============================================
   // LIFECYCLE
   // ============================================
   
   onMount(() => {
      audioElement = new Audio();
      audioElement.volume = volume;
      
      audioElement.addEventListener('play', () => isPlaying = true);
      audioElement.addEventListener('pause', () => isPlaying = false);
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
      if (isBroadcasting) stopBroadcast();
   });
   
   function handleTrackEnded() {
      isPlaying = false;
      currentTime = 0;
      if (isBroadcasting) stopBroadcast();
   }
   
   function handleTimeUpdate() {
      currentTime = audioElement.currentTime;
      duration = audioElement.duration || 0;
   }
   
   // ============================================
   // TRACK MANAGEMENT
   // ============================================
   
   async function addTrack() {
      const picker = new FilePicker({
         type: 'audio',
         callback: async (path) => {
            const newTrack = {
               id: foundry.utils.randomID(),
               name: path.split('/').pop().replace(/\.[^/.]+$/, ''),
               path,
               category: 'theme'
            };
            await doc.setFlag(MODULE_ID, 'music.tracks', [...tracks, newTrack]);
         }
      });
      picker.render(true);
   }
   
   async function removeTrack(trackId) {
      const confirmed = await Dialog.confirm({
         title: 'Remove Track',
         content: '<p>Are you sure you want to remove this track?</p>'
      });
      
      if (confirmed) {
         await doc.setFlag(MODULE_ID, 'music.tracks', tracks.filter(t => t.id !== trackId));
         if (currentTrackId === trackId) {
            stopTrack();
            await doc.setFlag(MODULE_ID, 'music.currentTrack', null);
         }
      }
   }
   
   async function renameTrack(track) {
      const newName = await Dialog.prompt({
         title: 'Rename Track',
         content: `<input type="text" name="name" value="${track.name}" style="width: 100%">`,
         callback: (html) => html.find('input[name="name"]').val()
      });
      
      if (newName && newName !== track.name) {
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
   
   // ============================================
   // PLAYBACK CONTROLS
   // ============================================
   
   async function playTrack(track) {
      if (!audioElement) return;
      
      if (currentTrackId === track.id && isPlaying) {
         audioElement.pause();
         if (isBroadcasting) syncState();
      } else {
         currentTrackId = track.id;
         audioElement.src = track.path;
         audioElement.play();
         await doc.setFlag(MODULE_ID, 'music.currentTrack', track.id);
         
         if (isBroadcasting) {
            broadcastPlay(track);
         }
      }
   }
   
   function stopTrack() {
      if (audioElement) {
         audioElement.pause();
         audioElement.currentTime = 0;
         isPlaying = false;
         currentTime = 0;
      }
      if (isBroadcasting) {
         emitSocket('stopMusic', { docName: doc.name });
         stopBroadcast();
      }
   }
   
   function setVolume(e) {
      volume = parseFloat(e.target.value);
      if (audioElement) audioElement.volume = volume;
      
      if (isBroadcasting) {
         emitSocket('setVolume', { volume });
      }
   }
   
   function seekTo(e, track) {
      if (!audioElement || currentTrackId !== track.id) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audioElement.currentTime = percent * duration;
      
      if (isBroadcasting) syncState();
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
   
   function broadcastPlay(track) {
      emitSocket('playMusic', {
         path: track.path,
         name: track.name,
         actorName: doc.name,
         volume,
         currentTime: audioElement?.currentTime || 0
      });
   }
   
   function startBroadcast() {
      if (!isGM || !currentTrack) return;
      
      isBroadcasting = true;
      broadcastPlay(currentTrack);
      
      // Start sync interval
      syncInterval = setInterval(syncState, 5000);
   }
   
   function stopBroadcast() {
      isBroadcasting = false;
      if (syncInterval) {
         clearInterval(syncInterval);
         syncInterval = null;
      }
   }
   
   function syncState() {
      if (!isBroadcasting || !audioElement) return;
      emitSocket('syncMusic', {
         currentTime: audioElement.currentTime,
         isPlaying
      });
   }
   
   function toggleBroadcast() {
      if (isBroadcasting) {
         emitSocket('stopMusic', { actorName: doc.name });
         stopBroadcast();
      } else {
         startBroadcast();
      }
   }
   
   function broadcastToPlayer(track, userId) {
      if (!isGM) return;
      emitSocket('playMusic', {
         path: track.path,
         name: track.name,
         actorName: doc.name,
         volume,
         currentTime: 0,
         targetUsers: [userId]
      });
   }
   
   function broadcastTrackToAll(track) {
      if (!isGM) return;
      emitSocket('playMusic', {
         path: track.path,
         name: track.name,
         actorName: doc.name,
         volume,
         currentTime: 0
      });
   }
</script>

<ApplicationShell bind:elementRoot>
   <main class="music-shell">
      <!-- Header with volume and add button -->
      <header class="music-header">
         <h2>
            <i class="fas fa-music"></i>
            {doc?.name ?? 'Document'}'s Music
         </h2>
         <div class="header-controls">
            <div class="volume-control" title="Volume">
               <i class="fas fa-volume-{volume > 0.5 ? 'up' : volume > 0 ? 'down' : 'mute'}"></i>
               <input type="range" min="0" max="1" step="0.05" value={volume} on:input={setVolume} />
            </div>
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
                  <i class="fas fa-broadcast-tower"></i> LIVE
               </span>
            {/if}
         </div>
      {/if}
      
      <!-- Track List -->
      <div class="track-list">
         {#if tracks.length === 0}
            <div class="empty-state">
               <i class="fas fa-music fa-3x"></i>
               <p>No tracks added yet</p>
               <p class="hint">Click + to add character music</p>
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
                           <select class="category-select" value={track.category || 'theme'} 
                              on:change={(e) => setCategoryForTrack(track, e.target.value)}>
                              {#each categories as cat}
                                 <option value={cat.id}>{cat.label}</option>
                              {/each}
                           </select>
                           
                           
                           {#if isGM}
                              <!-- Broadcast dropdown (with toggle for current track) -->
                              <div class="broadcast-dropdown">
                                 <button 
                                    type="button" 
                                    class="broadcast-btn"
                                    class:active={isCurrentTrack && isBroadcasting}
                                    title={isCurrentTrack && isBroadcasting ? 'Broadcasting...' : 'Broadcast'}
                                 >
                                    <i class="fas fa-broadcast-tower"></i>
                                 </button>
                                 <div class="broadcast-menu">
                                    {#if isCurrentTrack && isBroadcasting}
                                       <button type="button" on:click={toggleBroadcast}>
                                          <i class="fas fa-stop"></i> Stop Broadcast
                                       </button>
                                    {:else if isCurrentTrack}
                                       <button type="button" on:click={toggleBroadcast}>
                                          <i class="fas fa-play"></i> Start Broadcast
                                       </button>
                                    {/if}
                                    <button type="button" on:click={() => broadcastTrackToAll(track)}>
                                       <i class="fas fa-globe"></i> Play for All
                                    </button>
                                    {#each onlinePlayers as player}
                                       <button type="button" on:click={() => broadcastToPlayer(track, player.id)}>
                                          <i class="fas fa-user"></i> {player.name}
                                       </button>
                                    {/each}
                                    {#if onlinePlayers.length === 0}
                                       <span class="no-players">No players online</span>
                                    {/if}
                                 </div>
                              </div>
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
