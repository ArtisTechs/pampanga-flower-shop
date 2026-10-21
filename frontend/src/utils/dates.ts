// Shop times are always shown in Philippine time, whatever the viewer's time zone.
const shopDateTimeFormat = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila"
});

export const formatShopDateTime = (iso: string) => shopDateTimeFormat.format(new Date(iso));

// Value for <input type="datetime-local"> in the viewer's local time.
export const toDateTimeLocalValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
