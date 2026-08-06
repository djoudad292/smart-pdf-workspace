import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { StoreService } from './store.service';
import { AIService } from '../ai/ai.service';

const DEMO_COMPANY_ID = 'demo';
const DEMO_DOC_TITLE = 'Smart PDF Workspace — Product Guide';

const DEMO_CONTENT = [
  'Smart PDF Workspace is a document Q&A platform that turns your PDFs into an intelligent assistant. Upload any PDF, and the platform extracts the text, indexes it with embeddings, and lets anyone ask natural-language questions and get instant, source-backed answers.',
  'Getting started is simple. Create an account, and you will land on the dashboard Overview. From there, open the Documents tab and drag a PDF into the upload area, or click Upload to pick a file from your computer. The document is processed automatically in seconds.',
  'Uploading a document. The Documents tab accepts PDF files. While a file is processing you will see a status indicator. Once processing finishes, the document status becomes Ready. You can then open it, download the original file, ask questions, generate a summary, or publish it.',
  'Asking questions. Every processed document has an Ask tab. Type a question in natural language, for example What are the key requirements?, and the AI answers using only the content of that document. Every answer includes references that show you exactly which part of the document the answer came from.',
  'Summaries. Open any ready document and click Summarize. The platform generates a concise executive summary of the whole document that you can read in seconds instead of reading every page.',
  'Publishing documents and the widget. When a document is Ready, toggle Published on. Published documents are served by the public widget: a small chat bubble that you can embed on any website with a single script tag. Visitors of that site can ask questions and get answers straight from your published documents.',
  'The widget is fully customizable. In Settings you can change the chat title, the accent color, and whether the bubble docks to the left or the right side of the screen. The widget loads your published documents automatically, so every change you make goes live instantly.',
  'Working with your team. The Team tab lets you invite colleagues by email. Invited members sign in with their own account and share the same company workspace, so the whole team can upload documents, ask questions, and manage the widget together.',
  'Security and privacy. Your files are stored securely and are never shared with other companies. Only published documents are exposed to the public widget, and the AI only answers from your own indexed content. You can unpublish or delete any document at any time.',
  'Reindexing and keeping answers fresh. If you replace the contents of a PDF, open the document and choose Reindex. The platform re-extracts and re-embeds the text so the AI answers always reflect the latest version of the file.',
].join('\n\n');

export async function seedDemoData(store: StoreService, ai: AIService): Promise<void> {
  const logger = new Logger('DemoSeed');
  try {
    let company = await store.findCompanyById(DEMO_COMPANY_ID);
    if (!company) {
      company = await store.createCompany({
        id: DEMO_COMPANY_ID,
        name: 'Smart PDF Workspace Demo',
        slug: 'demo',
        plan: 'free',
        settings: {
          widget: {
            title: 'Ask about our product',
            color: '#EF4444',
            position: 'right',
          },
        },
      });
      logger.log(`Created demo company (${company.id})`);
    } else {
      await store.updateCompanySettings(DEMO_COMPANY_ID, {
        widget: { title: 'Ask about our product', color: '#EF4444', position: 'right' },
      });
    }

    let doc = (await store.findDocumentsByCompany(DEMO_COMPANY_ID, 1, 1)).items.find(
      (d) => d.title === DEMO_DOC_TITLE,
    );
    if (!doc) {
      doc = await store.createDocument({
        id: randomUUID(),
        companyId: DEMO_COMPANY_ID,
        title: DEMO_DOC_TITLE,
        filename: 'smart-pdf-workspace-guide.txt',
        mime: 'text/plain',
        sizeBytes: Buffer.byteLength(DEMO_CONTENT),
        content: DEMO_CONTENT,
        pageCount: 1,
        status: 'ready',
        summary: null,
        published: true,
        error: null,
      });
      logger.log(`Created demo document (${doc.id})`);
    }

    const chunkCount = await store.countChunksByDocument(doc.id);
    if (chunkCount === 0) {
      const paragraphs = DEMO_CONTENT.split(/\n\s*\n/).filter((p) => p.trim());
      for (let i = 0; i < paragraphs.length; i++) {
        const embedding = await ai.generateEmbedding(paragraphs[i]);
        await store.insertChunk({
          id: randomUUID(),
          documentId: doc.id,
          companyId: DEMO_COMPANY_ID,
          chunkIndex: i,
          chunkText: paragraphs[i],
          embedding,
        });
      }
      logger.log(`Indexed ${paragraphs.length} demo chunks`);
    }

    if (!doc.published) {
      await store.updateDocument(doc.id, { published: true, status: 'ready' });
    }
  } catch (err) {
    logger.warn(`Demo seed skipped: ${(err as Error).message}`);
  }
}
