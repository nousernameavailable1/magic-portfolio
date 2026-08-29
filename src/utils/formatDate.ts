const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const dubaiDateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Dubai",
});

export function formatDate(date: string, includeRelative = false) {
  const currentDate = new Date();
  const normalizedDate = date.includes("T") ? date : `${date}T00:00:00`;
  const targetDate = new Date(normalizedDate);
  const timeDifference = currentDate.getTime() - targetDate.getTime();
  const daysAgo = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  const hoursAgo = Math.floor(timeDifference / (1000 * 60 * 60));
  const minutesAgo = Math.floor(timeDifference / (1000 * 60));
  let formattedDate = "";

  if (daysAgo >= 365) {
    formattedDate = `${Math.floor(daysAgo / 365)}y ago`;
  } else if (daysAgo >= 30) {
    formattedDate = `${Math.floor(daysAgo / 30)}mo ago`;
  } else if (daysAgo > 0) {
    formattedDate = `${daysAgo}d ago`;
  } else if (hoursAgo > 0) {
    formattedDate = `${hoursAgo}h ago`;
  } else if (minutesAgo > 0) {
    formattedDate = `${minutesAgo}m ago`;
  } else {
    formattedDate = "just now";
  }

  const fullDate = fullDateFormatter.format(targetDate);

  if (!includeRelative) {
    return fullDate;
  }

  return `${fullDate} (${formattedDate})`;
}

export function formatDubaiDateTime(value: string | Date) {
  return dubaiDateTimeFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
