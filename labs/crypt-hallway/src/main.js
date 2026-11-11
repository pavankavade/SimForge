// Two halls in one lab: ?hall=boulder is Ep2's boulder hallway (boulder/main.js); anything else is
// the crypt hall of Ep1 (crypt.js).
const HALL = new URLSearchParams(location.search).get("hall");
if (HALL === "boulder") await import("./boulder/main.js");
else if (HALL === "walls") await import("./walls/main.js"); // Ep3's crushing room
else await import("./crypt.js");
