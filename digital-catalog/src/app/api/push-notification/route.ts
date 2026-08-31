import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const pushMessages = Array.isArray(body) ? body : body.messages || [body];

        if (!pushMessages || pushMessages.length === 0) {
            return NextResponse.json({ error: 'Nenhuma mensagem para enviar' }, { status: 400 });
        }

        const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pushMessages),
        });

        const data = await expoResponse.json();

        return NextResponse.json(data, {
            status: expoResponse.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error: any) {
        console.error('[PushProxy] Erro ao repassar notificação para Expo:', error);
        return NextResponse.json(
            { error: error?.message || 'Falha ao despachar push' },
            { 
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            }
        );
    }
}
