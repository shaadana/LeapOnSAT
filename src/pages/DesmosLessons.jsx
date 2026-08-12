import React, { useState } from 'react';
import DesmosHero from '../components/desmos/DesmosHero';
import DesmosCategories from '../components/desmos/DesmosCategories';
import DesmosLesson from '../components/desmos/DesmosLesson';

export default function DesmosLessons() {
  const [activeLesson, setActiveLesson] = useState(null);

  if (activeLesson) {
    return <DesmosLesson lesson={activeLesson} onBack={() => setActiveLesson(null)} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <DesmosHero />
      <DesmosCategories onSelectLesson={setActiveLesson} />
    </div>
  );
}
