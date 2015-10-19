// ! Global Variables Section !


// Establishes connection to Server (defaults to connecting to host that served page so no URL required in argument)
var socket = io();

chatForm = document.getElementById("chat-form");
chatFormInput = document.getElementById("chat-form-input");


// ! Global Objects Section !

/* Don't be confused by this object. Right now it is only a means to storing certain phrases formatted around document.cookie. 
E.g. cookiesInfo.printConsoleChange doesn't do anything to figure out if the cookies have changed at some point. It only prints
document.cookie with a different phrase at the beginning. Evenutally, adding logic for only printing the cookies that have changed
since the last cookiesInfo.printConsoleChange might be helpful. */
var cookiesInfo = {
  printConsoleBeforeScriptLoad: function() {console.log('Existing cookies before script loads: ' + '"' + document.cookie + '"')},
  printConsoleCurrent: function() {console.log('Current Cookies:  ' + '"' + document.cookie + '"')},
  printConsoleChange: function() {console.log('Cookie change, Current Cookies:  ' + '"' + document.cookie + '"')}
};

// ! End of Global Objects Section !
// ! End of Global Variables Section !

cookiesInfo.printConsoleBeforeScriptLoad();

// ! Central Function Calls Section !
// These are the central functions of the program. They should be completely independent of each other. That is, they don't need each other to exist to work.

loadMuteState();
handleMuteToggle('toggle-mute');
alertClientConnect();
handleServerEmits();
handleClientEmits();
// ! End of Central Function Calls Section !

// ! Central Functions' Definitions Section !


// On page load, reads the 'mute-status' cookie which has the mute state of chat sounds from the last session and applies that cookie to the 'toggle-mute' button and manageSound()
function loadMuteState() {
  var button = document.getElementById('toggle-mute');
  var keyValuePairs = document.cookie.split(/; */);
  for(var i = 0; i < keyValuePairs.length; i++) {
    var name = keyValuePairs[i].substring(0, keyValuePairs[i].indexOf('='));
    var value = keyValuePairs[i].substring(keyValuePairs[i].indexOf('=')+1);
    if (name === 'mute-status' && value === 'muted') {
      manageSound.muteAll = true;
      button.innerHTML = 'Turn Sound On';
    } 
    else if (name === 'mute-status' && value === 'not-muted') {
      manageSound.muteAll = false;
      button.innerHTML = 'Turn Sound Off';
    }
  }
}

// On mute button click, toggles the appearance of 'toggle-mute', toggles true/false value of manageSound.muteAll, and toggles the mute-status cookie
function handleMuteToggle(buttonId) {

  button = document.getElementById(buttonId);
  button.addEventListener('click', function(ev) {toggleMute(button)});

  function toggleMute(button) {
    // If manageSound has been explicitly muted, then unmute it.
    // Eventually need to put the contained cookie creation code in a funciton as it's used twice.
    if (manageSound.muteAll) {
      manageSound.muteAll = false;
      button.innerHTML = 'Turn Sound Off';
      // creates/re-creates cookie, setting it to expire 183 days from its creation/re-cretion date.
      // http://stackoverflow.com/questions/3818193/how-to-add-number-of-days-to-todays-date
      var expDate = new Date();
      var numberOfDaysToAdd = 183;
      var cookies = document.cookie;
      expDate.setDate(expDate.getDate() + numberOfDaysToAdd);  
      setCookie('mute-status', 'not-muted', expDate);
      cookiesInfo.printConsoleChange();
      // Easy way to delete cookie
      // document.cookie = 'cook' + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    /* If manageSound.muteAll has been explicitly set to false, or has not been defined yet, mute.
      (Because manageSound() only mutes if its muteAll property has been set to true, there
      could be a case where muteAll has not been defined and we would want to mute on toggle if that's true.
      Basically if muteAll has not been defined (if user hasn't ever clicked toggle button) we want to default to not muting, but mute on toggle.) */
    else {
      manageSound.muteAll = true;
      button.innerHTML = 'Turn Sound On'
      // See above
      var expDate = new Date();
      var numberOfDaysToAdd = 183;
      var cookies = document.cookie;
      expDate.setDate(expDate.getDate() + numberOfDaysToAdd);  
      setCookie('mute-status', 'muted', expDate);
      cookiesInfo.printConsoleChange();
    }

  }
}

// Tells the client user that their client has connected.
function alertClientConnect() {
  alertClient('Notice: Connection established!');
  var sound = document.getElementById('yahhoo');
  manageSound(sound);
}


// Does things based off of the events emitted by the server
function handleServerEmits() {
  var messages = document.getElementById('messages')
  socket.on('chat message', function(msg){
    messages.innerHTML += '<li>' + msg + '</li>';
    scrollMessagesDown();
    var sound = document.getElementById('coin-get');
    manageSound(sound);
  });
  
  // Doesn't play sound when client receives its own chat message back from the server
  socket.on('own chat message', function(msg){
    alertClient(msg);
    scrollMessagesDown();
  });
  
  alertConnectionChanges();
  
  // Should eventually be split up between events that are acutally emitted by the server and events that the socket itself fires off
  function alertConnectionChanges() {
    socket.on('error', alertClientConnectionError);
    socket.on('disconnect', alertClientDisconnect);
    socket.on('reconnect', alertClientReconnect);
   
    function alertClientConnectionError() {
      alertClient('Warning: Connection Issues!');
      scrollMessagesDown();
    };
    
    function alertClientDisconnect() {
      alertClient('Warning: Disconnected!');
      scrollMessagesDown();
      var sound = document.getElementById('they-re-killing-me');
      manageSound(sound);
    };
    
    function alertClientReconnect() {
      alertClient('Notice: Connection restablished!')
      scrollMessagesDown();
      var sound = document.getElementById('yahhoo');
      manageSound(sound);
    };
  };
};

// Emits events to server based off of things that happen in the client
function handleClientEmits() {
  chatForm.addEventListener("submit", function(ev){
    // ev.preventDefault(); prevents form from actually submitting and thus the page from refreshing (but the event listener still fires)
    ev.preventDefault();
    socket.emit('chat message', chatFormInput.value);
    chatFormInput.value = "";
  });
};

// ! End of Central Functions' Definitions Section !


// ! Reusable Component Functions' Definitions Section !
/* These are functions that are used (or will be used) in more than one Central Function (so they're defined once on the same level as the Central Functions as opposed to multiple times inside of the Central Functions). */

function setCookie(name, value, expDate) {
  //If expDate exists then convert to UTC format
  (expDate) && (expDate = expDate.toUTCString());
  var c_value = encodeURI(value) + ((expDate === null || expDate === undefined) ? "" : "; expires=" + expDate);
  document.cookie = name + "=" + c_value;
};

function alertClient(msg) {
  messages.innerHTML += '<li>' + msg + '</li>'
};

// Consider placing inside alertClient and only use alertClient() to write to messages. alertClient() might need a rename if we do that
function scrollMessagesDown() {
  var objDiv = document.getElementById('message-container');
  objDiv.scrollTop = objDiv.scrollHeight;
}

function manageSound(sound) {
  if (manageSound.muteAll !== true) {
    sound.play();
  } else {
    console.log(sound.getAttribute('id') + ' is muted');
  }
}

// ! End of Reusable Component Functions' Definitions Section !
