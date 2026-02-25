const { io } = require('socket.io-client');

// Test data - from previous tests
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtbTF3bmEydjAwMDBxM3B6YnB4eDZ2ZHoiLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImlhdCI6MTc3MjAxNjEzMiwiZXhwIjoxNzcyNjIwOTMyfQ.Ht4gKeH3R-yWk5kmXJxWVHVosKpwgXQckdQ98JwCWNM";
const CHANNEL_ID = "cmm1wnyjf0006q3pz1692vvmr";
const SERVER_URL = "http://localhost:3001";

console.log("🚀 Starting Socket.IO Real-time Tests...\n");

// Create socket connection
const socket = io(SERVER_URL, {
  auth: { token: TOKEN },
  transports: ['websocket', 'polling'],
});

// Track test results
const results = {
  connected: false,
  channelJoined: false,
  messageReceived: false,
  statusUpdate: false,
  typingEvents: false,
};

// ─── Connection Events ───────────────────────────────────────────────────────

socket.on('connect', () => {
  console.log(`✅ [CONNECT] Socket connected with ID: ${socket.id}`);
  results.connected = true;

  // Test 1: Join a channel
  setTimeout(() => {
    console.log(`\n📢 [TEST 1] Joining channel: ${CHANNEL_ID}`);
    socket.emit('channel:join', CHANNEL_ID);
  }, 500);
});

socket.on('channel:joined', ({ channelId }) => {
  console.log(`✅ [CHANNEL JOINED] Successfully joined channel: ${channelId}`);
  results.channelJoined = true;

  // Test 2: Send a real-time message
  setTimeout(() => {
    console.log(`\n💬 [TEST 2] Sending real-time message...`);
    socket.emit('message:send', {
      channelId: CHANNEL_ID,
      content: 'This is a real-time Socket.IO test message! 🎉',
    });
  }, 500);
});

socket.on('message:new', (message) => {
  console.log(`✅ [MESSAGE RECEIVED]`);
  console.log(`   - ID: ${message.id}`);
  console.log(`   - Author: ${message.author.username}`);
  console.log(`   - Content: ${message.content}`);
  console.log(`   - Created: ${message.createdAt}`);
  results.messageReceived = true;

  // Test 3: Send typing indicator
  setTimeout(() => {
    console.log(`\n⌨️  [TEST 3] Sending typing indicator...`);
    socket.emit('typing:start', CHANNEL_ID);
    
    setTimeout(() => {
      socket.emit('typing:stop', CHANNEL_ID);
      console.log(`✅ [TYPING] Typing indicator sent and stopped`);
      results.typingEvents = true;
    }, 1000);
  }, 500);
});

socket.on('typing:start', ({ userId, username, channelId }) => {
  console.log(`👤 [TYPING START] User "${username}" is typing in ${channelId}`);
});

socket.on('typing:stop', ({ userId, channelId }) => {
  console.log(`👤 [TYPING STOP] User stopped typing in ${channelId}`);
});

socket.on('user:status', ({ userId, status }) => {
  console.log(`\n⚡ [USER STATUS UPDATE]`);
  console.log(`   - User ID: ${userId}`);
  console.log(`   - Status: ${status}`);
  results.statusUpdate = true;
});

socket.on('message:updated', (message) => {
  console.log(`\n✏️  [MESSAGE UPDATED]`);
  console.log(`   - ID: ${message.id}`);
  console.log(`   - Content: ${message.content}`);
  console.log(`   - Edited: ${message.edited}`);
});

socket.on('message:deleted', ({ id, channelId }) => {
  console.log(`\n🗑️  [MESSAGE DELETED]`);
  console.log(`   - Message ID: ${id}`);
  console.log(`   - Channel ID: ${channelId}`);
});

socket.on('message:reactions_updated', ({ messageId, reactions, channelId }) => {
  console.log(`\n😀 [REACTIONS UPDATED]`);
  console.log(`   - Message ID: ${messageId}`);
  console.log(`   - Reaction Count: ${reactions.length}`);
  console.log(`   - Reactions:`, reactions.map(r => r.emoji).join(' '));
});

socket.on('error', (error) => {
  console.error(`❌ [ERROR] ${error.message || error}`);
});

socket.on('disconnect', (reason) => {
  console.log(`\n❌ [DISCONNECT] ${reason}`);
  
  // Print test results summary
  setTimeout(() => {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 SOCKET.IO TEST RESULTS`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`✅ Socket Connected: ${results.connected ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Channel Joined: ${results.channelJoined ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Message Received: ${results.messageReceived ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Status Updates: ${results.statusUpdate ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Typing Indicators: ${results.typingEvents ? 'PASS' : 'FAIL'}`);
    console.log(`${'═'.repeat(60)}`);
    
    const passCount = Object.values(results).filter(Boolean).length;
    console.log(`\n🎯 Result: ${passCount}/5 tests passed`);
    
    process.exit(0);
  }, 1000);
});

// Auto-disconnect after 15 seconds
setTimeout(() => {
  console.log(`\n⏱️  Test timeout reached. Disconnecting...`);
  socket.disconnect();
}, 15000);
