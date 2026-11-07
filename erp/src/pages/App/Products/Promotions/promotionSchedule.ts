export function shouldConfirmImmediateActivation(
  campaign: { status: string; startsOn: string; endsOn: string; timezoneName: string },
  now = new Date()
) {
  if (campaign.status !== 'scheduled' || !campaign.startsOn || !campaign.endsOn) return false;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: campaign.timezoneName,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value || '';
    const today = `${value('year')}-${value('month')}-${value('day')}`;

    return campaign.startsOn <= today && today <= campaign.endsOn;
  } catch {
    return false;
  }
}
