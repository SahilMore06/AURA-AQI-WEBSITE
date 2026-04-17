import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { aqi, temperature, humidity, pm25 = 0, no2 = 0, o3 = 0 } = await req.json()

    // Deterministic advanced advisory based on various environmental parameters
    let baseStatus = "";
    let riskLevel = "LOW";
    let recommendations: string[] = [];

    // Analyze AQI
    if (aqi <= 50) {
      baseStatus = `SYSTEM STATUS: OPTIMAL. AIR QUALITY INDEX (${aqi}) IS WELL WITHIN SAFE PARAMETERS.`;
      riskLevel = "LOW";
      recommendations.push("IDEAL CONDITIONS FOR EXTENDED OUTDOOR ACTIVITIES.");
    } else if (aqi <= 100) {
      baseStatus = `SYSTEM STATUS: MODERATE. AIR QUALITY INDEX (${aqi}) IS ACCEPTABLE.`;
      riskLevel = "MODERATE";
      recommendations.push("SENSITIVE INDIVIDUALS SHOULD LIMIT PROLONGED OUTDOOR EXERTION.");
    } else if (aqi <= 150) {
      baseStatus = `SYSTEM STATUS: COMPROMISED. AIR QUALITY INDEX (${aqi}) IS UNHEALTHY FOR SENSITIVE GROUPS.`;
      riskLevel = "ELEVATED";
      recommendations.push("REDUCE OUTDOOR EXERTION. ACTIVE CHILDREN AND ADULTS WITH RESPIRATORY ISSUES SHOULD REMAIN INDOORS.");
    } else if (aqi <= 200) {
      baseStatus = `SYSTEM STATUS: CRITICAL. AIR QUALITY INDEX (${aqi}) IS UNHEALTHY.`;
      riskLevel = "HIGH";
      recommendations.push("AVOID PROLONGED OUTDOOR EXERTION. ALL POPULATIONS MAY EXPERIENCE HEALTH ADVERSE EFFECTS.");
      recommendations.push("ACTIVATE INDOOR AIR FILTRATION SYSTEMS.");
    } else {
      baseStatus = `SYSTEM STATUS: EMERGENCY. AIR QUALITY INDEX (${aqi}) IS HAZARDOUS.`;
      riskLevel = "SEVERE";
      recommendations.push("REMAIN INDOORS COMPULSORILY.");
      recommendations.push("SEAL ALL WINDOWS. MAXIMIZE INDOOR AIR PURIFICATION.");
    }

    // Correlate with Temperature & Humidity
    if (temperature && temperature > 90) {
      if (humidity && humidity > 60) {
         recommendations.push(`HIGH HEAT (${temperature}°F) AND HUMIDITY (${humidity}%) DETECTED. SEVERE RISK OF HEAT EXHAUSTION. HYDRATE IMMEDIATELY.`);
      } else {
         recommendations.push(`HIGH TEMPERATURE ALERT (${temperature}°F) DETECTED. LIMIT SUN EXPOSURE AND MAINTAIN HYDRATION PROTOCOLS.`);
      }
    } else if (temperature && temperature < 32) {
      recommendations.push(`FREEZING TEMPERATURES (${temperature}°F) DETECTED. ENSURE PROPER THERMAL INSULATION IF OUTDOOR DEPLOYMENT IS NECESSARY.`);
    }

    if (humidity && humidity < 20) {
      recommendations.push(`CRITICAL LOW HUMIDITY (${humidity}%) MAY CAUSE RESPIRATORY IRRITATION. EMPLOY HUMIDIFIERS EXCEEDING 40% CAPACITY.`);
    }

    const compiledAdvisory = `${baseStatus} [THREAT LEVEL: ${riskLevel}] \nRECOMMENDATIONS: ${recommendations.join(" ")}`;

    return new Response(
      JSON.stringify({ advisory: compiledAdvisory, risk: riskLevel }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
