import {
  toggleDisplay,
  createOptionElement,
  createPlayerCircle,
  changeCircleBorder,
  deleteOption,
  createMessageDiv,
} from "./ui.js";

let messagesCount = 0;
let numberOfPlayers = 0;
let readyPlayers = 0;
let playersTable = [];
let allPlayers = [];
let ownCardShown = false;

export function registerEventListeners(wsManager) {
  const startGameBtn = document.getElementById("start-game");
  const characterSendBtn = document.getElementById("character-send");
  const opponentSelect = document.getElementById("opponent-select");
  const characterInput = document.getElementById("character-input");

  startGameBtn.addEventListener("click", () => {
    if (readyPlayers === numberOfPlayers - 1) {
      toggleDisplay("#start-game", "none");
      toggleDisplay("#characters", "flex");
      toggleDisplay("#players", "none");
      toggleDisplay("#room", "none");

      wsManager.sendMessage({
        roomCode: wsManager.roomCode,
        type: "start-game",
      });
    } else {
      window.alert("Please wait for all players to be ready.");
    }
  });

  characterSendBtn.addEventListener("click", () => {
    const opponentName = opponentSelect.value;
    const character = characterInput.value;

    if (!opponentName || !character) {
      window.alert("Please enter both your opponent's name and character.");
      return;
    }

    if (playersTable.includes(opponentName)) {
      window.alert(
        `The character for ${opponentName} has already been added, please choose a different player`
      );
      return;
    }

    toggleDisplay(".input-block", "none");
    if (wsManager.isHost == 1) {
      toggleDisplay("#start-game", "block");
    } else {
      toggleDisplay("#start-game-message", "block");
    }

    wsManager.sendMessage({
      opponentName,
      character,
      playerName: wsManager.playerName,
      roomCode: wsManager.roomCode,
      type: "sendCharacters",
    });
  });
}

export function setupWebSocketHandlers(wsManager) {
  wsManager.on("reconnect-failed", () => {
    localStorage.removeItem("headsup_session");
    window.location.href = "/";
  });

  wsManager.on("dataFromDb", (data) => {
    if (wsManager.roomCode != data.roomCode) return;

    const allNames = data.data.map((obj) => obj.name);
    const allIsReady = data.data.map((obj) => obj.isready);
    const characters = data.data.map((obj) => obj.character);
    const images = data.data.map((obj) => obj.url);

    const notAddedPlayers = allNames
      .map((name, index) => (allPlayers.includes(name) ? null : { name, index }))
      .filter((entry) => entry !== null);
    allPlayers = allNames;
    numberOfPlayers = allNames.length;

    for (let i = 0; i < notAddedPlayers.length; i++) {
      const { name, index } = notAddedPlayers[i];
      if (name === wsManager.playerName) continue;

      if (characters[index] != null) {
        createMessageDiv(name, characters[index], images[index]);
      } else {
        createOptionElement(name);
      }
      createPlayerCircle(name);

      if (allIsReady[index] === 1) {
        changeCircleBorder(name);
        readyPlayers++;
      }
    }

    // Restore own mystery card if we've been assigned a character (e.g. after reconnect)
    const selfIndex = allNames.indexOf(wsManager.playerName);
    if (!ownCardShown && selfIndex !== -1 && characters[selfIndex] != null) {
      ownCardShown = true;
      createMessageDiv(wsManager.playerName, "???????", images[selfIndex]);
    }

    // Restore game-started UI if the game was already running when we reconnected
    if (data.hasStarted) {
      toggleDisplay("#start-game", "none");
      toggleDisplay("#characters", "flex");
      toggleDisplay("#players", "none");
      toggleDisplay("#room", "none");
      toggleDisplay("#start-game-message", "none");
    }
  });

  wsManager.on("sendCharacters", (data) => {
    if (wsManager.roomCode != data.roomCode) return;

    if (wsManager.playerName === data.opponentName) {
      ownCardShown = true;
      createMessageDiv(data.opponentName, "???????", data.url);
      changeCircleBorder(data.playerName);
      readyPlayers++;
    } else if (wsManager.playerName === data.playerName) {
      createMessageDiv(data.opponentName, data.character, data.url);
    } else {
      playersTable.push(data.opponentName);
      createMessageDiv(data.opponentName, data.character, data.url);
      changeCircleBorder(data.playerName);
      readyPlayers++;
      deleteOption(data.opponentName);
    }
  });

  wsManager.on("start-game", (data) => {
    if (wsManager.roomCode != data.roomCode) return;
    toggleDisplay("#start-game", "none");
    toggleDisplay("#characters", "flex");
    toggleDisplay("#players", "none");
    toggleDisplay("#room", "none");
    toggleDisplay("#start-game-message", "none");
  });
}
