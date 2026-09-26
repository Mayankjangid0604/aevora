import { Injectable, Logger } from '@nestjs/common';
import { ModelGateway } from '@aevora/model-gateway';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TEMPLATES_DIR = join(__dirname, 'templates');

const DEMO_SYSTEM = `You are a web designer. Generate a complete, professional, mobile-friendly single-page HTML website for a local business.
Requirements:
- Use Google Fonts (link in head)
- All CSS inline in a <style> tag
- No external scripts or JavaScript
- Professional color scheme matching the industry
- Sections: Hero, Services/Menu, Pricing (if applicable), Contact
- Use the business name, phone, email provided
- Return ONLY the complete HTML document, no explanation`;

function loadTemplate(industry: string, vars: Record<string, string>): string | null {
  const file = join(TEMPLATES_DIR, `${industry}.html`);
  if (!existsSync(file)) return null;
  let html = readFileSync(file, 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }
  return html;
}

@Injectable()
export class DemoFactoryService {
  private readonly logger = new Logger(DemoFactoryService.name);
  private modelGateway = new ModelGateway();

  async generateDemoHtml(businessName: string, industry: string, phone?: string, email?: string): Promise<string> {
    const key = industry.toLowerCase().replace(/[^a-z]/g, '');
    const vars = {
      BUSINESS_NAME: businessName,
      PHONE: phone ?? '',
      EMAIL: email ?? '',
      COMPANY_NAME: process.env.COMPANY_NAME ?? 'AEVORA',
    };

    const template = loadTemplate(key, vars);
    if (template) {
      this.logger.log(`Using file template for ${industry}`);
      return template;
    }

    this.logger.log(`Generating AI demo for ${businessName} (${industry})`);
    try {
      const res = await this.modelGateway.generate({
        systemMessage: DEMO_SYSTEM,
        prompt: `Business: "${businessName}"\nIndustry: "${industry}"\nPhone: ${phone ?? 'N/A'}\nEmail: ${email ?? 'N/A'}`,
        complexity: 'COMPLEX',
        maxTokens: 6000,
      });
      const fenced = res.text.match(/```(?:html)?\s*([\s\S]*?)```/i);
      const body = (fenced ? fenced[1] : res.text).trim();
      const start = body.search(/<!doctype html|<html/i);
      return start >= 0 ? body.slice(start) : `<!doctype html><html><body>${body}</body></html>`;
    } catch (e) {
      this.logger.warn(`AI generation failed, using generic template: ${e.message}`);
      return loadTemplate('restaurant', vars) ?? `<!doctype html><html><body><h1>${businessName}</h1></body></html>`;
    }
  }

  async createAndDeployDemo(businessName: string, industry: string, phone?: string, email?: string): Promise<string | null> {
    const html = await this.generateDemoHtml(businessName, industry, phone, email);

    const vercelToken = process.env.VERCEL_API_TOKEN;
    if (!vercelToken) {
      this.logger.warn('VERCEL_API_TOKEN missing — demo generated but not deployed');
      return null;
    }

    try {
      const projectName = `demo-${businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          files: [{ file: 'index.html', data: Buffer.from(html).toString('base64'), encoding: 'base64' }],
          projectSettings: { framework: null },
          target: 'production',
        }),
      });
      if (!deployRes.ok) throw new Error(`Vercel ${deployRes.status}: ${await deployRes.text()}`);
      const data = await deployRes.json();
      const url = `https://${data.url}`;

      // Disable SSO protection so demo is publicly accessible
      try {
        await fetch(`https://api.vercel.com/v9/projects/${projectName}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ssoProtection: null }),
        });
      } catch {}

      this.logger.log(`Demo deployed: ${url}`);
      return url;
    } catch (e) {
      this.logger.error(`Vercel deploy failed for ${businessName}: ${e.message}`);
      return null;
    }
  }
}
