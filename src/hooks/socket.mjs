import { MODULE_ID } from '#config';

/**
 * Audio element for receiving broadcast music
 * @type {HTMLAudioElement|null}
 */
let broadcastAudio = null;

/**
 * Register socket listeners for the module
 */
export function registerSocketListeners() {
   game.socket.on(`module.${MODULE_ID}`, handleSocketMessage);
}

/**
 * Handle incoming socket messages
 * @param {object} message - The socket message
 */
function handleSocketMessage(message) {
   const { type, senderId, data } = message;
   
   // Don't process messages from self
   if (senderId === game.user.id) return;
   
   // Check if message is targeted to specific users
   if (data?.targetUsers && !data.targetUsers.includes(game.user.id)) return;
   
   switch (type) {
      case 'playMusic':
         handlePlayMusic(data);
         break;
      case 'stopMusic':
         handleStopMusic(data);
         break;
      case 'syncMusic':
         handleSyncMusic(data);
         break;
      case 'setVolume':
         handleSetVolume(data);
         break;
   }
}

/**
 * Handle play music command from GM
 * @param {object} data - Music data
 */
function handlePlayMusic(data) {
   const { path, name, actorName, volume = 0.5, currentTime = 0 } = data;
   
   // Stop any currently playing broadcast audio
   if (broadcastAudio) {
      broadcastAudio.pause();
      broadcastAudio.src = '';
   }
   
   // Create new audio element
   broadcastAudio = new Audio(path);
   broadcastAudio.volume = volume;
   
   // Set current time if syncing
   broadcastAudio.addEventListener('loadedmetadata', () => {
      if (currentTime > 0) {
         broadcastAudio.currentTime = currentTime;
      }
   }, { once: true });
   
   // Try to play immediately
   const playPromise = broadcastAudio.play();
   
   if (playPromise !== undefined) {
      playPromise
         .then(() => {
            ui.notifications.info(`🎵 Playing ${actorName}'s theme: ${name}`);
         })
         .catch(() => {
            // Show dialog with play button for manual interaction
            new Dialog({
               title: `🎵 ${actorName}'s Theme`,
               content: `<p>Click play to hear <strong>${name}</strong></p>`,
               buttons: {
                  play: {
                     icon: '<i class="fas fa-play"></i>',
                     label: 'Play',
                     callback: () => {
                        broadcastAudio?.play().catch(() => {
                           ui.notifications.error(`Could not play audio: ${name}`);
                        });
                     }
                  },
                  skip: {
                     icon: '<i class="fas fa-times"></i>',
                     label: 'Skip',
                     callback: () => {
                        if (broadcastAudio) {
                           broadcastAudio.src = '';
                           broadcastAudio = null;
                        }
                     }
                  }
               },
               default: 'play'
            }).render(true);
         });
   }
   
   broadcastAudio.addEventListener('error', () => {
      ui.notifications.error(`Failed to load ${actorName}'s theme: ${name}`);
   });
   
   broadcastAudio.addEventListener('ended', () => {
      broadcastAudio = null;
   });
}

/**
 * Handle stop music command from GM
 * @param {object} data - Stop data
 */
function handleStopMusic(data) {
   const { actorName } = data;
   
   if (broadcastAudio) {
      broadcastAudio.pause();
      broadcastAudio.src = '';
      broadcastAudio = null;
      ui.notifications.info(`🎵 ${actorName}'s theme stopped`);
   }
}

/**
 * Handle sync music state (position)
 * @param {object} data - Sync data
 */
function handleSyncMusic(data) {
   const { currentTime, isPlaying } = data;
   
   if (!broadcastAudio) return;
   
   // Sync position if difference is more than 2 seconds
   if (Math.abs(broadcastAudio.currentTime - currentTime) > 2) {
      broadcastAudio.currentTime = currentTime;
   }
   
   // Sync play state
   if (isPlaying && broadcastAudio.paused) {
      broadcastAudio.play().catch(() => {});
   } else if (!isPlaying && !broadcastAudio.paused) {
      broadcastAudio.pause();
   }
}

/**
 * Handle volume change from GM
 * @param {object} data - Volume data
 */
function handleSetVolume(data) {
   const { volume } = data;
   
   if (broadcastAudio) {
      broadcastAudio.volume = volume;
   }
}
