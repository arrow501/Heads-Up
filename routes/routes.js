import { randomBytes } from "crypto";
import {
  roomExists,
  createRoom,
  getRoom,
  addPlayer,
  playerExists,
} from "../models/store.js";

const CODE_LENGTH = 5;

export const renderLogin = (req, res) => {
  res.render("login");
};

export const renderRoom = (req, res) => {
  res.render("index", {
    name: "",
    code: req.params.code,
    isHost: "",
    reconnectToken: "",
  });
};

export const handleNameSubmission = (req, res) => {
  const name =
    req.body.name.charAt(0).toUpperCase() + req.body.name.slice(1).toLowerCase();
  const action = req.body.action;
  const code = req.body.room;

  if (!name) {
    return res.status(400).json({ message: "Name is required." });
  }

  if (action === "create") {
    handleCreateRoom(name, res);
  } else if (action === "join") {
    handleJoinRoom(name, code, res);
  } else {
    res.status(400).json({ message: "Invalid action." });
  }
};

function handleCreateRoom(name, res) {
  try {
    let code = generateCode();
    while (roomExists(code)) {
      code = generateCode();
    }

    createRoom(code);
    const player = addPlayer(code, name);

    res.render("index", { name, code, isHost: 1, reconnectToken: player.reconnectToken });
  } catch (err) {
    console.error("Error creating room:", err);
    res.status(500).json({ message: "An error occurred while creating the room." });
  }
}

function handleJoinRoom(name, code, res) {
  try {
    const room = getRoom(code);

    if (!room) {
      return res.render("error-handler", { error: code, type: "room-code" });
    }
    if (room.hasStarted) {
      return res.render("error-handler", { error: code, type: "the-game-has-started" });
    }
    if (playerExists(code, name)) {
      return res.render("error-handler", { error: name, type: "duplicate-name" });
    }

    const player = addPlayer(code, name);
    res.render("index", { name, code, isHost: 0, reconnectToken: player.reconnectToken });
  } catch (err) {
    console.error("Error joining room:", err);
    res.status(500).json({ message: "An error occurred while joining the room." });
  }
}

function generateCode() {
  return randomBytes(Math.ceil(CODE_LENGTH / 2))
    .toString("hex")
    .slice(0, CODE_LENGTH)
    .toUpperCase();
}
