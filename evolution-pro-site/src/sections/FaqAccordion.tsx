import { useState } from 'react';
import { Section } from '../components/ui/Section';
import { siteContent } from '../content/siteContent';

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faq = siteContent.faq;
  const half = Math.ceil(faq.length / 2);
  const columns = [faq.slice(0, half), faq.slice(half)];

  return (
    <Section id="faq" tone="white" className="faq">
      <h2>Domande frequenti</h2>
      <div className="faq__columns">
        {columns.map((column, columnIndex) => (
          <div className="faq__list" key={columnIndex}>
            {column.map((item, itemIndex) => {
              const index = columnIndex === 0 ? itemIndex : half + itemIndex;
              const open = openIndex === index;
              const buttonId = `faq-button-${index}`;
              const panelId = `faq-panel-${index}`;
              return (
                <div className="faq__item" key={item.question}>
                  <h3><button id={buttonId} aria-expanded={open} aria-controls={panelId} onClick={() => setOpenIndex(open ? null : index)}>{item.question}<span aria-hidden="true">{open ? '−' : '+'}</span></button></h3>
                  <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}><p>{item.answer}</p></div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Section>
  );
}
