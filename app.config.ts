import 'dotenv/config';

export default {
  expo: {
    name: 'Multilingual Record',
    slug: 'multilingual-record',
    extra: {
      openaiApiKey: process.env.OPENAI_API_KEY,
    }
  }
}
