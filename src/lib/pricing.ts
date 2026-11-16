export const resolveHourlyRate = (station: Station, room: Room | undefined, pricing: Pricing) =>
  station.hourlyRate ?? room?.hourlyRate ?? pricing.defaultHourly;