import { useState } from 'react';
import { AppEvent } from '../types';
import EventCard from '../components/EventCard';
import { MOCK_EVENTS } from '../data/mockData';

export default function Events() {
  const [events] = useState<AppEvent[]>(MOCK_EVENTS);

  return (
    <div className="pb-24 pt-20 px-6">
      <div className="mb-12">
        <span className="text-primary text-xs font-bold tracking-widest uppercase">Live on Stage</span>
        <h1 className="text-5xl font-black tracking-tighter italic leading-none">CATCH <br />JUX LIVE</h1>
      </div>

      <div className="space-y-6">
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
