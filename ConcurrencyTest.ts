import axios from "axios";

const URL = "http://localhost:3000/reservations";

const NUM_USERS = 12;

async function simulateReservation(i: number) {
    console.log("send for Partner",i)
  try {
    const response = await axios.post(URL, {
      partnerId: `Partner${i}`,
      seats: 1,
    });
    console.log(`Partner${i} Success:`, response.data);
  } catch (err:any) {
    console.log(`Partner${i} Failed:`, err.response?.data || err.message);
  }
}

async function main() {
  const promises = [];
  for (let i = 0; i < NUM_USERS; i++) {
    promises.push(simulateReservation(i));
  }
  await Promise.all(promises);
}

main();
