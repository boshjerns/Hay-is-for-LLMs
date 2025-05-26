// Simple test script to verify API integrations
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');

async function testOpenAI(apiKey) {
  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say hello!" }],
      max_tokens: 10
    });
    console.log("✅ OpenAI API working:", response.choices[0].message.content);
    return true;
  } catch (error) {
    console.log("❌ OpenAI API error:", error.message);
    return false;
  }
}

async function testGemini(apiKey) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Say hello!");
    const response = await result.response;
    console.log("✅ Gemini API working:", response.text());
    return true;
  } catch (error) {
    console.log("❌ Gemini API error:", error.message);
    return false;
  }
}

async function testClaude(apiKey) {
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 10,
      messages: [{ role: "user", content: "Say hello!" }]
    });
    console.log("✅ Claude API working:", response.content[0].text);
    return true;
  } catch (error) {
    console.log("❌ Claude API error:", error.message);
    return false;
  }
}

// Example usage (replace with your actual API keys to test)
async function runTests() {
  console.log("🧪 Testing API Integrations...\n");
  
  // Replace these with your actual API keys to test
  const OPENAI_KEY = "your-openai-key-here";
  const GEMINI_KEY = "your-gemini-key-here";
  const CLAUDE_KEY = "your-claude-key-here";
  
  if (OPENAI_KEY !== "your-openai-key-here") {
    await testOpenAI(OPENAI_KEY);
  } else {
    console.log("⏭️  Skipping OpenAI test (no API key provided)");
  }
  
  if (GEMINI_KEY !== "your-gemini-key-here") {
    await testGemini(GEMINI_KEY);
  } else {
    console.log("⏭️  Skipping Gemini test (no API key provided)");
  }
  
  if (CLAUDE_KEY !== "your-claude-key-here") {
    await testClaude(CLAUDE_KEY);
  } else {
    console.log("⏭️  Skipping Claude test (no API key provided)");
  }
  
  console.log("\n✨ Test complete! Replace the API keys in this file to test your actual keys.");
}

if (require.main === module) {
  runTests();
}

module.exports = { testOpenAI, testGemini, testClaude }; 