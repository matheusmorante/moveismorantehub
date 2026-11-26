type TemplatePreview = {
  name?: string;
  header?: { type: 'text' | 'image' | 'video' | 'document'; text?: string; filename?: string };
  body?: string;
  footer?: string;
  buttons: Array<{ type: 'url' | 'quick_reply' | 'phone_number' | 'flow'; text: string; url?: string; phoneNumber?: string }>;
};

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null;
}

function templateParameterText(parameter: any): string {
  switch (String(parameter?.type || '').toLowerCase()) {
    case 'text':
      return typeof parameter.text === 'string' ? parameter.text.trim().slice(0, 4096) : '';
    case 'currency':
      return typeof parameter.currency?.fallback_value === 'string'
        ? parameter.currency.fallback_value.trim().slice(0, 256)
        : '';
    case 'date_time':
      return typeof parameter.date_time?.fallback_value === 'string'
        ? parameter.date_time.fallback_value.trim().slice(0, 256)
        : '';
    default:
      return '';
  }
}

function templateComponentText(component: any): string {
  if (typeof component?.text === 'string') {
    const parameters = Array.isArray(component.parameters) ? component.parameters : [];
    return component.text.slice(0, 4096).replace(/\{\{\s*(\d+)\s*\}\}/g, (placeholder, rawIndex) => {
      const value = templateParameterText(parameters[Number(rawIndex) - 1]);
      return value || placeholder;
    });
  }
  return Array.isArray(component?.parameters)
    ? component.parameters.map(templateParameterText).filter(Boolean).join(' ').slice(0, 4096)
    : '';
}

function templateButton(component: any): TemplatePreview['buttons'][number] | null {
  const rawType = String(component?.sub_type || component?.type || '').toLowerCase();
  const type = rawType.includes('quick') ? 'quick_reply'
    : rawType === 'url' || rawType.includes('call_to_action') ? 'url'
      : rawType.includes('phone') ? 'phone_number'
        : rawType.includes('flow') ? 'flow'
          : null;
  if (!type) return null;
  const text = [component?.text, component?.title, component?.label]
    .find((value) => typeof value === 'string' && value.trim());
  const button: TemplatePreview['buttons'][number] = {
    type,
    text: (text || (type === 'url' ? 'Abrir link' : type === 'phone_number' ? 'Ligar' : type === 'flow' ? 'Abrir formulário' : 'Responder'))
      .trim().slice(0, 120),
  };
  if (type === 'url' && typeof component?.url === 'string') button.url = component.url.trim().slice(0, 2048);
  const phone = component?.phone_number || component?.phoneNumber;
  if (type === 'phone_number' && typeof phone === 'string') button.phoneNumber = phone.trim().slice(0, 40);
  return button;
}

export function extractTemplatePreview(message: any): { preview: TemplatePreview; mediaId?: string; mediaMimeType?: string; mediaFilename?: string } | null {
  const template = asRecord(message?.template) || asRecord(message?.template_preview) || message;
  const components = Array.isArray(template.components) ? template.components : [];
  const componentOf = (name: string) => components.find((component: any) => String(component?.type || '').toLowerCase() === name) || null;
  const headerComponent = componentOf('header') || asRecord(template.header);
  const bodyComponent = componentOf('body') || (typeof template.body === 'string' ? { text: template.body } : null);
  const footerComponent = componentOf('footer') || (typeof template.footer === 'string' ? { text: template.footer } : null);
  const headerParameters = Array.isArray(headerComponent?.parameters) ? headerComponent.parameters : [];
  const mediaParameter = headerParameters.find((parameter: any) => ['image', 'video', 'document'].includes(String(parameter?.type || '').toLowerCase()));
  const mediaType = mediaParameter ? String(mediaParameter.type).toLowerCase() as 'image' | 'video' | 'document' : null;
  const media = mediaParameter && asRecord(mediaParameter[mediaType as string]);
  const headerFormat = String(headerComponent?.format || headerComponent?.type || '').toLowerCase();
  const headerText = templateComponentText(headerComponent) ||
    (typeof headerComponent?.text === 'string' ? headerComponent.text.trim().slice(0, 4096) : '');
  const headerType = mediaType || (headerFormat.includes('video') ? 'video'
    : headerFormat.includes('document') ? 'document'
      : headerFormat.includes('image') ? 'image'
        : headerText ? 'text' : null);
  const header = headerType ? {
    type: headerType as NonNullable<TemplatePreview['header']>['type'],
    ...(headerText ? { text: headerText } : {}),
    ...(typeof media?.filename === 'string' ? { filename: media.filename.trim().slice(0, 255) } : {}),
  } : undefined;
  const rawButtons = [
    ...components.flatMap((component: any) => String(component?.type || '').toLowerCase() === 'buttons'
      ? Array.isArray(component.buttons) ? component.buttons : []
      : String(component?.type || '').toLowerCase() === 'button' ? [component] : []),
    ...(Array.isArray(template.buttons) ? template.buttons : []),
  ];
  const buttons = rawButtons.map(templateButton).filter((button: any): button is TemplatePreview['buttons'][number] => Boolean(button)).slice(0, 10);
  const name = typeof template.name === 'string' ? template.name.trim().slice(0, 255) : '';
  const body = templateComponentText(bodyComponent);
  const footer = templateComponentText(footerComponent);
  if (!name && !header && !body && !footer && buttons.length === 0) return null;
  const preview: TemplatePreview = {
    ...(name ? { name } : {}),
    ...(header ? { header } : {}),
    ...(body ? { body } : {}),
    ...(footer ? { footer } : {}),
    buttons,
  };
  return {
    preview,
    ...(typeof media?.id === 'string' && media.id.trim() ? { mediaId: media.id.trim() } : {}),
    ...(typeof media?.mime_type === 'string' && media.mime_type.trim() ? { mediaMimeType: media.mime_type.trim() } :
      mediaType === 'image' ? { mediaMimeType: 'image/jpeg' } : mediaType === 'video' ? { mediaMimeType: 'video/mp4' } : {}),
    ...(typeof media?.filename === 'string' && media.filename.trim() ? { mediaFilename: media.filename.trim().slice(0, 255) } : {}),
  };
}
