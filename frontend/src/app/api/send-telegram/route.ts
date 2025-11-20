import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!message || !botToken) {
      return NextResponse.json(
        { error: 'Missing message or bot token not configured' },
        { status: 400 }
      );
    }

    // Получаем последние обновления от бота для определения последнего чата
    const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
    const updatesData = await updatesResponse.json();

    if (!updatesData.ok || !updatesData.result || updatesData.result.length === 0) {
      return NextResponse.json(
        { error: 'No recent chats found' },
        { status: 400 }
      );
    }

    // Получаем ID последнего чата
    const lastUpdate = updatesData.result[updatesData.result.length - 1];
    const chatId = lastUpdate.message?.chat?.id || lastUpdate.callback_query?.message?.chat?.id;

    if (!chatId) {
      return NextResponse.json(
        { error: 'Could not determine chat ID' },
        { status: 400 }
      );
    }

    // Отправляем сообщение в последний чат
    const sendResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }),
    });

    const sendData = await sendResponse.json();

    if (!sendData.ok) {
      return NextResponse.json(
        { error: 'Failed to send message', details: sendData.description },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      chatId: chatId
    });

  } catch (error) {
    console.error('Telegram API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
