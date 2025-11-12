"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

export default function SecondaryDisplay() {
  const [messages, setMessages] = useState([]);
  const [connectionState, setConnectionState] = useState("waiting");
  const [backgroundColor, setBackgroundColor] = useState("#1e293b");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Initialize Presentation Receiver
    if ("presentation" in navigator && navigator.presentation.receiver) {
      navigator.presentation.receiver.connectionList
        .then((list) => {
          setConnectionState("connected");

          list.connections.forEach((connection) => {
            addMessage("✅ Connected to main display");

            // Listen for messages from main display
            connection.addEventListener("message", (event) => {
              try {
                const data = JSON.parse(event.data);
                addMessage(`📨 Received: ${data.message}`);

                // Update background color if provided
                if (data.color) {
                  setBackgroundColor(data.color);
                }

                // Send acknowledgment back to main display
                connection.send(
                  JSON.stringify({
                    type: "ack",
                    message: "Message received",
                    timestamp: Date.now(),
                  })
                );
              } catch (error) {
                addMessage(`❌ Error parsing message: ${error.message}`);
              }
            });

            connection.addEventListener("close", () => {
              addMessage("🔌 Connection closed");
              setConnectionState("closed");
            });

            connection.addEventListener("terminate", () => {
              addMessage("⛔ Connection terminated");
              setConnectionState("terminated");
            });
          });

          // Listen for new connections
          list.addEventListener("connectionavailable", (event) => {
            const connection = event.connection;
            addMessage("🔗 New connection available");
            setConnectionState("connected");
          });
        })
        .catch((error) => {
          addMessage(`❌ Error: ${error.message}`);
          setConnectionState("error");
        });
    } else {
      addMessage("❌ Not running as presentation receiver");
      setConnectionState("unsupported");
    }

    return () => clearInterval(timer);
  }, []);

  const addMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 transition-colors duration-500"
      style={{ backgroundColor }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-lg rounded-2xl px-8 py-4 border border-white/20">
          <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
          <h1 className="text-4xl font-bold text-white">Secondary Display</h1>
        </div>
      </div>

      {/* Status Card */}
      <Card className="w-full max-w-4xl bg-white/10 backdrop-blur-lg border-white/20 p-8 mb-6">
        <div className="grid grid-cols-2 gap-6 text-white">
          <div className="text-center">
            <p className="text-sm text-white/60 mb-2">Connection Status</p>
            <p className="text-3xl font-bold capitalize">{connectionState}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-white/60 mb-2">Current Time</p>
            <p className="text-3xl font-bold">
              {currentTime.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Messages Display */}
      <Card className="w-full max-w-4xl bg-white/10 backdrop-blur-lg border-white/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          📨 Messages from Main Display
        </h2>
        <div className="bg-black/30 rounded-lg p-4 h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-white/60 text-center py-8">
              Waiting for messages...
            </p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded px-3 py-2 text-white text-sm font-mono"
                >
                  <span className="text-white/60">[{msg.timestamp}]</span>{" "}
                  {msg.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Info Footer */}
      <div className="mt-8 text-center">
        <p className="text-white/80 text-lg">
          🖥️ This screen is controlled by the main POS display
        </p>
        <p className="text-white/60 text-sm mt-2">
          Display ID:{" "}
          {typeof window !== "undefined"
            ? window.screen.id || "Secondary"
            : "Secondary"}
        </p>
      </div>
    </div>
  );
}
