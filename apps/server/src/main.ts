import { createAuctionManagerServer } from "./app.js";

const host = process.env.HOST?.trim() || "127.0.0.1";
const port = parseLocalPort(process.env.PORT ?? "3000");
const dataDirectory = process.env.DATA_DIRECTORY?.trim();

try {
  const server = await createAuctionManagerServer({
    logger: true,
    ...(dataDirectory ? { dataDirectory } : {})
  });
  await server.listen({ host, port });
} catch (error) {
  console.error(error);
  process.exit(1);
}

function parseLocalPort(value: string) {
  const portNumber = Number.parseInt(value, 10);

  if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65_535) {
    throw new Error(`Invalid PORT value "${value}". Use a local TCP port from 1 to 65535.`);
  }

  return portNumber;
}
