import { useState } from "react";
import axios from "axios";

export default function BatchProcessPage() {
  const [startLine, setStartLine] = useState("");
  const [endLine, setEndLine] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await axios.get(`/api/batchprocess`, {
        params: { startLine, endLine },
      });
      setMessage(response.data.response);
    } catch (error) {
      setMessage("An error occurred while processing.");
    }
  };

  return (
    <div>
      <h1>Batch Process</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="startLine">Start Line:</label>
          <input
            type="number"
            id="startLine"
            value={startLine}
            onChange={(e) => setStartLine(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="endLine">End Line:</label>
          <input
            type="number"
            id="endLine"
            value={endLine}
            onChange={(e) => setEndLine(e.target.value)}
            required
          />
        </div>
        <button type="submit">Start Batch Process</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
