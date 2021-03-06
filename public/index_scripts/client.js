// ! Global Variables Section !


// Establishes connection to Server (defaults to connecting to host that served page so no URL required in argument)
var socket = io();

var chatForm = document.getElementById("chat-form");
var chatFormInput = document.getElementById("chat-form-input");
var current_client_saved_username;
var connectedUsers = [];



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
loadUsername();
handleSetUsername();
alertClientConnect();
handleServerEmits();
handleClientEmits();
fadeOutWelcome();
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

// Note that if client loses connnection and reconnects it is not automatically set to resubmit its username which it will need to do to have its name.
// ^ That has been hack/fixed but will need refactoring.
// Right now if that happened the user would need to refresh or manually re-enter their username to submit it.
function loadUsername() {
  var button = document.getElementById('username');
  var keyValuePairs = document.cookie.split(/; */);
  for(var i = 0; i < keyValuePairs.length; i++) {
    var name = keyValuePairs[i].substring(0, keyValuePairs[i].indexOf('='));
    var value = keyValuePairs[i].substring(keyValuePairs[i].indexOf('=')+1);
    if (name && name === 'username') {
      // decodeURI undoes cookies automatic encoding of special characters to URL codes. This allows the original characters to be usd as the username and 
      // will thus let usernames be executed as HTML. 
      socket.emit('username submit', decodeURI(value));
      // allows username submission on reconnect.
      current_client_saved_username = decodeURI(value);
    }
  }
};

// This should probably be moved to handleServerEmits
function handleSetUsername() {
  var button = document.getElementById('change-username');
  var form = document.getElementById('change-username-form');
  var input = document.getElementById('change-username-form-input');
  var buttonState = 'not changing';
  button.addEventListener('click', watchButtonAndForm);
  
  function watchButtonAndForm(ev) {
    // If the user hasn't clicked to start changing user nam
    if (buttonState === 'not changing') {
      buttonState = 'changing';
      button.innerHTML = 'Save Username';
      form.classList.toggle('hidden');
      input.focus();
      // Start listening for a submit (enter key)
      form.addEventListener('submit', innerWatcher);
      
      // If the user chooses to send the info by pressing the "Save Username" button (as opposed to pressing enter).
    } else if (buttonState === 'changing') {
      socket.emit('username submit', input.value);
      // So username can be resubmitted on reconnect. Will need refactoring.
      current_client_saved_username = input.value;
      input.blur();
      form.classList.toggle('hidden');
      button.innerHTML = 'Change Username';
      buttonState = 'not changing';
      var expDate = new Date();
      var numberOfDaysToAdd = 183;
      var cookies = document.cookie;
      expDate.setDate(expDate.getDate() + numberOfDaysToAdd);  
      setCookie('username', input.value, expDate);
      cookiesInfo.printConsoleChange();
      input.value = "";
      // Stop listening for the enter key because we already sent the data without hearing the user press enter.
      console.log('innerWatcher should get removed');
      form.removeEventListener('submit', innerWatcher);
    }
    // innnerWatcher handles submit events (events when the user submits the form by pressing enter).
    
    
    
  };
  
  // innerWatcher must be defined out here as opposed to inside watchButtonAndForm because if it were in there every time the Change Username button is clicked innerWatcher would be redefined. If it were redefined every time, the removeEventListener('submit', innerWatcher); in the buttonState === 'changing' conditional would be attempting to remove an event listener with an instance of innerWatcher that has not been added to form, so no event listener would get removed in that case.
  
  function innerWatcher(ev){
      // ev.preventDefault(); prevents form from actually submitting and thus the page from refreshing (but the event listener still fires)
      ev.preventDefault();
      console.log(ev);
      socket.emit('username submit', input.value);
      // see above
      current_client_saved_username = input.value;
      input.blur();
      form.classList.toggle('hidden');
      button.innerHTML = 'Change Username';
      buttonState = 'not changing';
      var expDate = new Date();
      var numberOfDaysToAdd = 183;
      var cookies = document.cookie;
      expDate.setDate(expDate.getDate() + numberOfDaysToAdd);  
      setCookie('username', input.value, expDate);
      cookiesInfo.printConsoleChange();
      input.value = "";
      form.removeEventListener('submit', innerWatcher);
      console.log('submit fired');
    };
};


// Tells the client user that their client has connected.
function alertClientConnect() {
  alertClient('Notice: Connection established!');
  var sound = document.getElementById('yahhoo');
  manageSound(sound);
}


	var Notification = window.Notification || window.mozNotification || window.webkitNotification;

	Notification.requestPermission(function (permission) {
		console.log(permission);
	});









// Does things based off of the events emitted by the server
function handleServerEmits() {
  var popMessageArray = [];
  var popMessageContainer = document.getElementById('pop-message-container');
  var messages = document.getElementById('messages')
  socket.on('chat message', function(msg){
    var newLi = document.createElement('li')
    newLi.innerHTML = msg;
    messages.appendChild(newLi);
    scrollMessagesDown();
    var sound = document.getElementById('coin-get');
    manageSound(sound);
    if (handleBlurFocusEvents.windowBlurred) {
      createNotification(msg);
    }
  });
  
  // Doesn't play sound when client receives its own chat message back from the server
  socket.on('own chat message', function(msg){
    alertClient(msg);
    scrollMessagesDown();
  });
  
  socket.on('pop message', function(msg) {
    var popMessageIdNumber = popMessageArray.length + 1;
    var popMessage = document.createElement('div');
    var popMessageContent = document.createElement('div');
    var popMessageExitButton = document.createElement('div');
    var popMessageDragTab = document.createElement('div');
    var popMessageClientXandLeftDiff, popMessageClientYandTopDiff
    popMessage.setAttribute('id', 'pop-message-' + popMessageIdNumber);
    popMessage.className += ' pop-message';
    // Flex keeps elements on same line even though containing div is of 0 width and height
    // I.E. 11 super flexbox stuff is super buggy. Todo: fix eventually?
    popMessage.style.display = 'flex';
    popMessage.style.position = 'absolute';
    popMessageContent.innerHTML = msg;
    popMessageExitButton.innerHTML = 'X';
    popMessageDragTab.innerHTML = 'Drag&nbsp;Tab';
    popMessageExitButton.className += ' pop-message-exit-button';
    popMessageContent.className += ' pop-message-content';
    popMessageDragTab.className += ' pop-message-drag-tab';
    popMessage.appendChild(popMessageDragTab);
    popMessage.appendChild(popMessageContent);
    popMessage.appendChild(popMessageExitButton);
    popMessageContainer.appendChild(popMessage);
    popMessageArray.push(popMessage);
    
    handlePopMessageDragging(popMessage);
    handlePopMessageExit();
    
    function handlePopMessageDragging(popMessage) {
      
      
      
      popMessage.addEventListener('mousedown', followMouseMove);
      
      document.body.addEventListener('mouseup', function(ev) {
        document.body.removeEventListener('mousemove', setDivPosition)
        
        // Re-displays the iframes
        var iframes = document.getElementsByTagName('iframe');
        for (var i = 0; i < iframes.length; i++) {
          // Probably not ideal to try to remove this on every mouse up.
          iframes[i].classList.remove('hidden');
        }
      });
      
      function followMouseMove(ev) {
        // These allow the div to be dragged without warping it's top left corner to the mouse position when dragging starts.
        var popMessageBounds = popMessage.getBoundingClientRect();
        popMessageClientXandLeftDiff = (ev.clientX - popMessageBounds['left']);
        popMessageClientYandTopDiff = (ev.clientY - popMessageBounds['top']);
        
         // Let's the div be dragged anywhere in viewport which isn't possible when iframes are displaying.
        var iframes = document.getElementsByTagName('iframe');
        for (var i = 0; i < iframes.length; i++) {
          iframes[i].classList.toggle('hidden');
        }
      
        
        // Prevents everything below from being highlightable when the div is click and dragged. (window.event is for older I.E. stuff)
        ev = ev || window.event;
        pauseEvent(ev);

        // Setting the popMessageContainer's position to anything other than fixed and height: 100% and width: 100% will probably break the mouse tracking since then 
        // the div would no longer be lined up with the viewport/page and so its x's and y's wouldn't be either.
        document.body.addEventListener('mousemove', setDivPosition);
      }

       
      function setDivPosition(ev) {
        
        
        
        
        
        popMessage.style.left = (ev.clientX - popMessageClientXandLeftDiff) + 'px';
        popMessage.style.top = (ev.clientY - popMessageClientYandTopDiff) + 'px';
        
      }
      
    }
    
    function handlePopMessageExit() {
      popMessageExitButton.addEventListener('mousedown', function(ev) {
        
        // Makes sure the iframes are displayed again.
        var iframes = document.getElementsByTagName('iframe');
        for (var i = 0; i < iframes.length; i++) {
          iframes[i].classList.remove('hidden');
        }
        
        //TODO: Make it so all the eventlisteners can be removed (aren't anonymous functions).
        // Probably doesn't entirely remove child from memory.
        popMessageContainer.removeChild(popMessage);
      });
    }
    
    // Prevents things from being selected when click and drag is performed.
    function pauseEvent(e){
      if(e.stopPropagation) e.stopPropagation();
      if(e.preventDefault) e.preventDefault();
      e.cancelBubble=true;
      e.returnValue=false;
      return false;
    }
  });
  
  // Makes everyone's computers focus on the tab and page, even if they're in another program and fullscreened. Use sparingly. (Only tested in Windows.)
  socket.on('fixate', function() {
    alert("Yo, I'm tawkin to yeh!");
  });
  
  socket.on('user connection state change', function(userObject) {
    if (userObject['state'] === 'connected') {
      connectedUsers.push(userObject['userName']);
    }
  });
  
  socket.on('reconnect', function() {
    console.log(current_client_saved_username);
    if (current_client_saved_username) {
      socket.emit('username submit', current_client_saved_username);
    }
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
  
  // Shows notification to user at bottom right of screen, regardless of whether the tab or browser containing the client is up
  function createNotification(message) {
    
    var instance = new Notification(
        "Message", {
            body: message
        }
    );

    instance.onclick = function () {
        // Something to do
    };
    instance.onerror = function () {
        // Something to do
    };
    instance.onshow = function () {
        // Something to do
    };
    instance.onclose = function () {
        // Something to do
    };

    setTimeout(instance.close.bind(instance), 4000);

    return false;
  }
};

// Emits events to server based off of things that happen in the client
function handleClientEmits() {
  chatForm.addEventListener("submit", function(ev){
    var inputValue = chatFormInput.value;
    // ev.preventDefault(); prevents form from actually submitting and thus the page from refreshing (but the event listener still fires)
    ev.preventDefault();
    var first7Characters = inputValue.substring(0, 7);
    var first6Characters = inputValue.substring(0, 6);
    console.log('input');
    console.log(inputValue);
    if (inputValue === '![mail]') {
      socket.emit('read mail');
      console.log('reading mail');
    } else if (first7Characters ==='![mail]') {

        // Start extraction at 13th character (index 12)
        var potentialLastTwoArguments = inputValue.substring(7);

        var openBracketIndices = getAllIndexes(potentialLastTwoArguments, '[');
        var closeBracketIndices = getAllIndexes(potentialLastTwoArguments, ']');
        var allBracketIndices = openBracketIndices.concat(closeBracketIndices);
        var escapedOpenBracketEscapeIndices = getAllIndexesForString(potentialLastTwoArguments, /\\\[/g);
        var escapedCloseBracketEscapeIndices = getAllIndexesForString(potentialLastTwoArguments, /\\]/g);
        var allEscapedBracketEscapeIndices = escapedOpenBracketEscapeIndices.concat(escapedCloseBracketEscapeIndices);
        allEscapedBracketEscapeIndices = allEscapedBracketEscapeIndices.sort(function(a,b){ return a - b; });
        var allEscapedBracketBracketIndices = [];
        var allUnescapedBracketIndices = [];
        // Count one up from each escape index that is escaping a bracket to get the index of the escaped bracket.
        for (var i = 0; i < allEscapedBracketEscapeIndices.length; i++) {
          allEscapedBracketBracketIndices[i] = allEscapedBracketEscapeIndices[i] + 1
        }
        // let's look at all brackets
        for (var i = 0; i < allBracketIndices.length; i++) {
          // if the bracket we are looking at is not escaped
          if (potentialLastTwoArguments[allBracketIndices[i] - 1] !== '\\') {
            // add that bracket's index to the allUnescapedBracketIndices array
            //works correctly
            allUnescapedBracketIndices.push(allBracketIndices[i]);
          }
        }

        if (allUnescapedBracketIndices.length > 4) {
          alertClient('<strong>Invalid syntax: Too many square brackets. Don\'t forget to escape (place \\ directly before) all the square brackets you want to be included in the recipient and message arguments.</strong>');
        } else if (allUnescapedBracketIndices.length < 4) {
          alertClient('<strong>Invalid syntax: Not enough brackets. Did you accidentally escape (place \\ directly before) more than 4 brackets?</strong>');
          // else the number of unescaped brackets must be 4, so...
        } else { 
          var wellFormedUnescapedBracketArray = ['[', ']', '[', ']'];
          // let's use each unescaped bracket index
          var failed = false;
          // ascending order
          allUnescapedBracketIndices = allUnescapedBracketIndices.sort(function(a,b){ return a - b; });
          for (var i = 0; i < allUnescapedBracketIndices.length; i++) {
            // if the unescaped bracket we are looking at DOES NOT correspond to the well formed model
            if (potentialLastTwoArguments[allUnescapedBracketIndices[i]] !== wellFormedUnescapedBracketArray[i]) {
              alertClient('<strong>Invalid syntax: Your argument brackets aren\'t all facing their partners. They should look like this: ![mail][recipient name][message content]</strong>');
              failed = true;
              break;
            }
          }
            // if we get to here, the argument brackets are (FINALLY!) known to be correctly formatted and thus syntatically unambiguous.
          if (!failed) {

            if (potentialLastTwoArguments.substring(allUnescapedBracketIndices[1] + 1, allUnescapedBracketIndices[2]) !== '') {
              alertClient('<strong>Warning: You placed text between the recipient and content arguments. There\'s no reason to do that! It will be ignored.</strong>');
            }

            var wellFormedLastTwoArguments = potentialLastTwoArguments;
            allEscapedBracketEscapeIndices = allEscapedBracketEscapeIndices.sort(function(a,b){ return a - b; });
            var recipientWithEscapes = wellFormedLastTwoArguments.slice(0, allUnescapedBracketIndices[1] + 1);
            var recipientWithEscapesOpenBracketEscapeIndices = getAllIndexesForString(recipientWithEscapes, /\\\[/g); 
            var recipientWithEscapesCloseBracketEscapeIndices = getAllIndexesForString(recipientWithEscapes, /\\]/g);
            var recipientWithEscapesAllBracketEscapeIndices = recipientWithEscapesOpenBracketEscapeIndices.concat(recipientWithEscapesCloseBracketEscapeIndices);
            recipientWithEscapesAllBracketEscapeIndices = recipientWithEscapesAllBracketEscapeIndices.sort(function(a,b){ return a - b; });

            console.log(recipientWithEscapesAllBracketEscapeIndices);
            var contentWithEscapes = wellFormedLastTwoArguments.slice(allUnescapedBracketIndices[2], allUnescapedBracketIndices[3] + 1);
            var contentWithEscapesOpenBracketEscapeIndices = getAllIndexesForString(contentWithEscapes, /\\\[/g); 
            var contentWithEscapesCloseBracketEscapeIndices = getAllIndexesForString(contentWithEscapes, /\\]/g);
            var contentWithEscapesAllBracketEscapeIndices = contentWithEscapesOpenBracketEscapeIndices.concat(contentWithEscapesCloseBracketEscapeIndices);
            contentWithEscapesAllBracketEscapeIndices = contentWithEscapesAllBracketEscapeIndices.sort(function(a,b){ return a - b; });
            console.log(contentWithEscapesAllBracketEscapeIndices)

            // Remove the escape symbol.
            var recipientLeft, recipientRight, formattedRecipient = recipientWithEscapes;
            for (var i = recipientWithEscapesAllBracketEscapeIndices.length - 1; i >= 0; i--) {
              recipientLeft = formattedRecipient.slice(0, recipientWithEscapesAllBracketEscapeIndices[i]);
              recipientRight = formattedRecipient.slice(recipientWithEscapesAllBracketEscapeIndices[i] + 1, recipientWithEscapes.length);
              formattedRecipient = recipientLeft + recipientRight;
            }
            // remove the argument brackets
            formattedRecipient = formattedRecipient.substring(1,formattedRecipient.length - 1);

            var contentLeft, contentRight, formattedContent = contentWithEscapes;
            for (var i = contentWithEscapesAllBracketEscapeIndices.length - 1; i >= 0; i--) {
              contentLeft = formattedContent.slice(0, contentWithEscapesAllBracketEscapeIndices[i]);
              console.log(contentLeft);
              contentRight = formattedContent.slice(contentWithEscapesAllBracketEscapeIndices[i] + 1, contentWithEscapes.length);
              console.log(contentRight);
              formattedContent = contentLeft + contentRight;
            }
            formattedContent = formattedContent.substring(1, formattedContent.length - 1);

            // ET ENFIN !
            socket.emit('send mail', formattedRecipient, formattedContent);


          }


        }
      
      } else if (first6Characters === '![pop]') {
        // match '![pop][any-character=except-close-square-bracket-before-end-of-string-and/or-new-line-characters]'
        var fullMatchedString = inputValue.match(/^!\[pop\]\[.+?\]$/);
        console.log(fullMatchedString[0] + 'hellooooo');
        var fullMatchedStringWithArgument = inputValue.match(/^!\[pop\]\[.+?\]\[ignoreHtml\]$/);
        // Allows html in chat  message to be ignored and displayed only as plain text
        if (fullMatchedStringWithArgument) {
          console.log(fullMatchedStringWithArgument + ' o');
          var partialMatchedString = fullMatchedStringWithArgument[0].substring(7, fullMatchedStringWithArgument[0].length - 13);
          console.log(partialMatchedString + 'je');
          socket.emit('pop message -no-cm-html-render', partialMatchedString);
          // Renders html in the chat message normally
        } else if (fullMatchedString) {
          var partialMatchedString = fullMatchedString[0].substring(7, fullMatchedString[0].length - 1);
          socket.emit('pop message', partialMatchedString);
        }
      } else {
        socket.emit('chat message', inputValue);
      }
    chatFormInput.value = "";
  });
};

// Removes welcome animation after fading it out after specified amount of time.
function fadeOutWelcome() {
  var welcomeAnim = document.getElementById('hover-page')
  setTimeout(function() {
    welcomeAnim.classList.add('fadeOut', 'animated');
    setTimeout(function() {document.body.removeChild(welcomeAnim)}, 1025);
  }, 5000);
}


// ! End of Central Functions' Definitions Section !

// ! Reusable Component Functions' Initilizations Section!
// Note that not all Reusable Component functions will have to be intialized and thus contained in this section.
handleBlurFocusEvents()
// ! End of Reusable Component Functions' Initilization Section!
// ! Reusable Component Functions' Definitions Section !
/* These are functions that are used (or will be used) in more than one Central Function (so they're defined once on the same level as the Central Functions as opposed to multiple times inside of the Central Functions). */

function getAllIndexesForString(str, regex) {
  var result, indices = [];
  while ( (result = regex.exec(str)) ) {
    indices.push(result.index);
  }
  return indices;
}


function getAllIndexes(arr, val) {
    var indexes = [], i;
    for(i = 0; i < arr.length; i++)
        if (arr[i] === val)
            indexes.push(i);
    return indexes;
}

function setCookie(name, value, expDate) {
  //If expDate exists then convert to UTC format
  (expDate) && (expDate = expDate.toUTCString());
  // var c_value = encodeURI(value) +  (if expDate === undefined OR null return "" if it doesn't equal undefined OR null return "; expires=" + expDate);
  var c_value = encodeURI(value) + ((expDate === null || expDate === undefined) ? "" : "; expires=" + expDate);
  document.cookie = name + "=" + c_value;
};

function alertClient(msg) {
  var newLi = document.createElement('li');
  newLi.innerHTML = msg;
  messages.appendChild(newLi);
  scrollMessagesDown();
};

// alertClient() might need a rename, and when I refactor I need to remove the scrollMessagesDown()s that are outside of the alertClients.
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

// Need to rename to take account of .onBlur
function handleBlurFocusEvents() {
  // Unsafe use as it will be overwritten if I ever need a function somewhere else to happen on blur/focus
  var windowBlurred = false;
  window.onblur = function() { handleBlurFocusEvents.windowBlurred = true;
                              console.log('window is blurred');
                             };
  window.onfocus = function() { handleBlurFocusEvents.windowBlurred = false;
                              console.log('window is focused');
                              };
  

  
}


// ! End of Reusable Component Functions' Definitions Section !

