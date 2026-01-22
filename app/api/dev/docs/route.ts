import { NextResponse } from 'next/server';
import { createDeveloperManager } from '@/lib/dev';
import { z } from 'zod';

const createDocSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.string().default('general'),
  isSensitive: z.boolean().default(true),
});

// List all docs
export async function GET() {
  try {
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const docs = await manager.listDocs();

    return NextResponse.json({ docs });
  } catch (error) {
    console.error('List docs error:', error);
    return NextResponse.json({ error: 'Failed to list docs' }, { status: 500 });
  }
}

// Create a new doc
export async function POST(req: Request) {
  try {
    const manager = await createDeveloperManager();

    if (!manager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createDocSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
    }

    const { title, content, category, isSensitive } = validation.data;

    const docId = await manager.saveDoc(title, content, category, isSensitive);

    return NextResponse.json({ success: true, docId });
  } catch (error) {
    console.error('Create doc error:', error);
    return NextResponse.json({ error: 'Failed to create doc' }, { status: 500 });
  }
}
