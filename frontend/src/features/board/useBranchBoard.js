import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { apiClient } from "../../lib/apiClient";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

const BOARD_EVENTS = [
  "queue:updated",
  "ticket:called",
  "ticket:completed",
  "ticket:skipped",
  "ticket:no-show",
  "ticket:cancelled",
  "ticket:recalled",
  "day:opened",
  "day:closed",
];

export const useBranchBoard = (branchId) => {
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [dayStatus, setDayStatus] = useState(null); // "open" | "closed" | null
  const refetchTimer = useRef(null);

  const fetchBoard = useCallback(async () => {
    try {
      const response = await apiClient.get(`/board/${branchId}`);
      setBoard(response.data);
      if (response.data.branch) {
        setDayStatus(response.data.branch.dayOpen ? "open" : "closed");
      }
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load this branch's board.");
    }
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;

    fetchBoard();

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("branch:join", branchId);
    });
    socket.on("disconnect", () => setConnected(false));

    // Track day status from socket events
    socket.on("day:opened", () => setDayStatus("open"));
    socket.on("day:closed", () => setDayStatus("closed"));

    const scheduleRefetch = () => {
      clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(fetchBoard, 400);
    };
    BOARD_EVENTS.forEach((event) => socket.on(event, scheduleRefetch));

    return () => {
      clearTimeout(refetchTimer.current);
      socket.disconnect();
    };
  }, [branchId, fetchBoard]);

  return { board, error, connected, dayStatus };
};
