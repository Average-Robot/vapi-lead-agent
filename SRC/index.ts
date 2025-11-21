import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware - these help process requests
app.use(cors());
app.use(express.json());

// Health check endpoint - test if server is running
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Vapi Lead Nurture Agent API is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// Vapi webhook - this is where Vapi sends call data
app.post('/api/vapi/webhook', async (req: Request, res: Response) => {
  try {
    console.log('📞 Received call from Vapi');
    console.log('Data:', JSON.stringify(req.body, null, 2));
    
    const { message } = req.body;
    
    // Handle when caller says something
    if (message?.type === 'assistant-request') {
      const userMessage = message.transcript || '';
      console.log('👤 User said:', userMessage);
      
      // Generate AI response
      const response = await generateAIResponse(userMessage);
      console.log('🤖 AI responds:', response);
      
      return res.json({ response });
    }
    
    // For other types of events, just acknowledge
    return res.json({ received: true });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to generate AI responses
async function generateAIResponse(userMessage: string): Promise<string> {
  // First message - greet the caller
  if (!userMessage) {
    return "Hello! Thanks for calling. I'm here to share how we partner with business owners like yourself to unlock new growth opportunities. To start, I'd love to learn about your business. What industry are you in?";
  }
  
  try {
    // Use OpenAI to generate response
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a knowledgeable business advisor helping business owners explore growth and partnership opportunities.

Your personality:
- Warm and professional, like a trusted consultant
- Curious about their business
- Helpful and educational, not pushy
- Ask thoughtful follow-up questions

Guidelines:
- Keep responses brief (2-3 sentences) since this is a phone call
- Ask ONE question at a time
- Listen and acknowledge what they share
- Share relevant insights when appropriate
- Help them understand if this could be a good fit

Topics to explore naturally:
- Their industry and business model
- Current challenges or goals
- Business size and growth stage  
- Their vision for the future
- What would make them consider a partnership`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    // Safely guard the response shape
    const content = completion?.choices?.[0]?.message?.content;
    return content ?? "I'm here to help. Could you tell me more about your business?";
           
  } catch (error) {
    console.error('OpenAI error:', error);
    return "I apologize, I'm having a brief technical issue. Could you repeat that?";
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📞 Webhook: http://localhost:${PORT}/api/vapi/webhook`);
});

// Export for Vercel
export default app;