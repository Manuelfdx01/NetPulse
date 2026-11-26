import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";

import { NetpulseApiClient } from "../static/src/js/api_client.js";

let server;
let baseUrl;

before(async () => {
    server = createServer(async (request, response) => {
        if (request.url === "/api/v1/auth/login") {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({
                access_token: "test.jwt.token",
                user: { id: 7, role: "technician" },
            }));
            return;
        }

        if (request.url === "/api/v1/incidents") {
            if (request.headers.authorization !== "Bearer test.jwt.token") {
                response.writeHead(401, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ error: "unauthorized" }));
                return;
            }
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ items: [{ id: 1, name: "INC-0001" }] }));
            return;
        }

        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "not_found" }));
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
});

test("el cliente mapea correctamente una respuesta HTTP exitosa", async () => {
    const client = new NetpulseApiClient(baseUrl);

    await client.login("tecnico", "password");
    const result = await client.listIncidents();

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].name, "INC-0001");
});

test("el cliente rechaza 401 y elimina el token almacenado en memoria", async () => {
    const client = new NetpulseApiClient(baseUrl);

    await client.login("tecnico", "password");
    client.accessToken = "token-invalido";

    await assert.rejects(
        () => client.listIncidents(),
        (error) => error.status === 401
    );
    assert.equal(client.accessToken, null);
});
