/**
 * Broadcast Service
 * Handles socket communication for music broadcasting
 * @module utils/broadcastService
 */

import { MODULE_ID } from '#config';

/**
 * Emit a socket message to other clients
 * @param {string} type - Message type
 * @param {object} data - Message data
 */
export function emitSocket(type, data) {
   game.socket.emit(`module.${MODULE_ID}`, {
      type,
      senderId: game.user.id,
      data
   });
}

/**
 * Broadcast play music command
 * @param {object} options - Broadcast options
 * @param {string} options.path - Audio file path
 * @param {string} options.name - Track name
 * @param {string} options.docName - Document name (actor/item)
 * @param {number} options.volume - Volume level (0-1)
 * @param {number} [options.currentTime=0] - Current playback time
 * @param {string[]} [options.targetUsers] - Specific user IDs to target
 */
export function broadcastPlayMusic({ path, name, docName, volume, currentTime = 0, targetUsers = null }) {
   emitSocket('playMusic', {
      path,
      name,
      actorName: docName,
      volume,
      currentTime,
      ...(targetUsers && { targetUsers })
   });
}

/**
 * Broadcast stop music command
 * @param {string} docName - Document name
 */
export function broadcastStopMusic(docName) {
   emitSocket('stopMusic', { actorName: docName });
}

/**
 * Broadcast volume change
 * @param {number} volume - New volume level
 */
export function broadcastSetVolume(volume) {
   emitSocket('setVolume', { volume });
}

/**
 * Broadcast sync state (current playback position)
 * @param {number} currentTime - Current playback time
 * @param {boolean} isPlaying - Whether music is playing
 */
export function broadcastSyncState(currentTime, isPlaying) {
   emitSocket('syncMusic', { currentTime, isPlaying });
}

/**
 * Create a broadcast controller for managing broadcast state
 * @param {HTMLAudioElement} audioElement - Audio element reference
 * @param {object} options - Controller options
 * @returns {object} Broadcast controller
 */
export function createBroadcastController(audioElement, options = {}) {
   let isBroadcasting = false;
   let syncInterval = null;
   const syncIntervalMs = options.syncInterval || 5000;
   
   function syncState() {
      if (!isBroadcasting || !audioElement) return;
      broadcastSyncState(audioElement.currentTime, !audioElement.paused);
   }
   
   return {
      get isBroadcasting() {
         return isBroadcasting;
      },
      
      start(track, docName, volume) {
         if (!game.user.isGM) return false;
         
         isBroadcasting = true;
         broadcastPlayMusic({
            path: track.path,
            name: track.name,
            docName,
            volume,
            currentTime: audioElement?.currentTime || 0
         });
         
         syncInterval = setInterval(syncState, syncIntervalMs);
         return true;
      },
      
      stop(docName) {
         isBroadcasting = false;
         if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
         }
         if (docName) {
            broadcastStopMusic(docName);
         }
      },
      
      sync() {
         syncState();
      },
      
      playForAll(track, docName, volume) {
         if (!game.user.isGM) return;
         broadcastPlayMusic({
            path: track.path,
            name: track.name,
            docName,
            volume,
            currentTime: 0
         });
      },
      
      playForUser(track, docName, volume, userId) {
         if (!game.user.isGM) return;
         broadcastPlayMusic({
            path: track.path,
            name: track.name,
            docName,
            volume,
            currentTime: 0,
            targetUsers: [userId]
         });
      }
   };
}
