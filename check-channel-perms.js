require("dotenv").config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", async () => {
  const guild = client.guilds.cache.find(g => g.name.includes("AIML"));

  if (!guild) {
    console.log("AIML server not found");
    client.destroy();
    return;
  }

  console.log("Server:", guild.name);
  console.log("");

  const channel = guild.channels.cache.find(ch => ch.name === "aiml-nov25-batch");

  if (channel) {
    console.log("Channel:", channel.name);
    console.log("Type:", channel.type);
    console.log("");

    // Check @everyone permissions
    const everyoneRole = guild.roles.everyone;
    const permissions = channel.permissionsFor(everyoneRole);

    console.log("@everyone permissions on this channel:");
    console.log("  ViewChannel:", permissions.has(PermissionFlagsBits.ViewChannel));
    console.log("  SendMessages:", permissions.has(PermissionFlagsBits.SendMessages));

    // Check permission overwrites
    console.log("");
    console.log("Permission overwrites:");
    channel.permissionOverwrites.cache.forEach((overwrite, id) => {
      const target = overwrite.type === 0 ? guild.roles.cache.get(id)?.name : "User: " + id;
      console.log("  -", target || id);
      console.log("    Allow:", overwrite.allow.toArray());
      console.log("    Deny:", overwrite.deny.toArray());
    });
  } else {
    console.log("Channel aiml-nov25-batch not found");
  }

  client.destroy();
});

client.login(process.env.DISCORD_TOKEN);
