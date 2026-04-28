export interface Event {
  id: string;
  title: string;
  description: string | null;
  host_name: string;
  date_range_start: string;
  date_range_end: string;
  created_at: number;
}

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  joined_at: number;
}

export interface Availability {
  id: string;
  participant_id: string;
  event_id: string;
  date: string;
}

export interface Vote {
  id: string;
  event_id: string;
  participant_id: string;
  date: string;
}

export interface DateOverlap {
  date: string;
  count: number;
  participants: string[];
  isPerfectMatch: boolean;
}

export interface AvailabilityResult {
  participants: Participant[];
  availability: Record<string, string[]>;
  overlaps: DateOverlap[];
  totalParticipants: number;
}
