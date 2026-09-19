import "dotenv/config";

import { createApp } from "./app";

const port = Number(process.env.PORT ?? 8787);

createApp().listen(port, "0.0.0.0", () => {
  console.log(`Conversation classifier listening on port ${port}`);
});
