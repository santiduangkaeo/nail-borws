import { getBkkNow, getBkkTodayRange } from '../src/lib/date-utils';
import { formatDate, formatTime } from '../src/lib/utils';

async function testTimezone() {
    console.log("--- Timezone Verification ---");

    const nowBkk = getBkkNow();
    console.log("Current BKK Time (getBkkNow):", nowBkk.toISOString());
    console.log("Formatted Date (BKK):", formatDate(nowBkk));
    console.log("Formatted Time (BKK):", formatTime(nowBkk));

    const { start, end } = getBkkTodayRange();
    console.log("\nToday's Range (BKK 00:00 - 23:59):");
    console.log("Start (UTC):", start.toISOString());
    console.log("End (UTC):", end.toISOString());

    // Expectation: Start should be 17:00 of previous day UTC
    // End should be 17:00 of current day UTC
    console.log("\n--- Verification Complete ---");
}

testTimezone();
