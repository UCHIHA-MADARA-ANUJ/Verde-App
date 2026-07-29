import { NextRequest, NextResponse } from 'next/server';
import { ref as dbRef, set } from 'firebase/database';
import { db } from '../../../lib/firebase';

export const runtime = 'edge';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "f05ed95dade7a0e5c831befb1f83a6e3";
const DELHI_LAT = "28.6139";
const DELHI_LON = "77.2090";

export async function GET(request: NextRequest) {
  try {
    let rainPredicted = false;
    let weatherDescription = "Clear (Local Simulator Fallback)";

    if (OPENWEATHER_API_KEY) {
      console.log(`[WEATHER SYNC] Fetching Delhi weather from OpenWeatherMap API...`);
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${DELHI_LAT}&lon=${DELHI_LON}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const mainCondition = data.weather?.[0]?.main || "Clear";
        weatherDescription = data.weather?.[0]?.description || "clear sky";

        // Active rain trigger matches
        const rainTriggers = ["Rain", "Drizzle", "Thunderstorm", "Snow"];
        if (rainTriggers.includes(mainCondition)) {
          rainPredicted = true;
        }
        console.log(`[WEATHER SYNC] Weather condition parsed: ${mainCondition} (${weatherDescription})`);
      } else {
        console.error(`[WEATHER SYNC] OpenWeatherMap request failed. Status: ${response.status}`);
      }
    } else {
      console.log(`[WEATHER SYNC] OPENWEATHER_API_KEY absent in .env.local. Running simulated dry loop.`);
    }

    // 2. Write weather override state into Firebase Realtime Database
    const overrideVal = rainPredicted ? 1 : 0;
    const weatherRef = dbRef(db, 'controls/weather_override');
    await set(weatherRef, overrideVal);
    console.log(`[WEATHER SYNC] Database written: controls/weather_override = ${overrideVal}`);

    return NextResponse.json({
      success: true,
      rainPredicted,
      condition: weatherDescription,
      overrideValue: overrideVal,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[WEATHER SYNC] Cron Execution Failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
