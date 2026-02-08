import { useState } from 'react';
import ConfirmContact from './ConfirmContact.jsx';
import ConfirmBooking from './ConfirmBooking.jsx';
import DeclineBooking from './DeclineBooking.jsx';

export default function ModalsDemo() {
  const [openContact, setOpenContact] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openDecline, setOpenDecline] = useState(false);

  const [result, setResult] = useState(null);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>Demo modals BookingManagement</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button style={btnPrimary} onClick={() => setOpenContact(true)}>Test ConfirmContact</button>
        <button style={btnSuccess} onClick={() => setOpenConfirm(true)}>Test ConfirmBooking</button>
        <button style={btnDanger} onClick={() => setOpenDecline(true)}>Test DeclineBooking</button>
      </div>

      {result && (
        <pre style={resultBox}>{JSON.stringify(result, null, 2)}</pre>
      )}

      <ConfirmContact
        open={openContact}
        onClose={() => setOpenContact(false)}
        onConfirm={(note) => {
          setResult({ type: 'contact', note });
          setOpenContact(false);
        }}
      />

      <ConfirmBooking
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={(data) => {
          setResult({ type: 'confirm', data });
          setOpenConfirm(false);
        }}
        request={{
          code: 'DB-202310 26-001',
          customerName: 'Nguyễn Văn A',
          bookingTime: '10:00 20/02/2026',
          service: 'Thay lốp',
          codeHref: '#',
          customerHref: '#',
          timeHref: '#',
          serviceHref: '#',
        }}
      />

      <DeclineBooking
        open={openDecline}
        onClose={() => setOpenDecline(false)}
        onConfirm={(payload) => {
          setResult({ type: 'decline', ...payload });
          setOpenDecline(false);
        }}
      />
    </div>
  );
}

const btnBase = {
  padding: '10px 16px',
  color: '#d40e0e',
  cursor: 'pointer',
  fontWeight: 700,
};

const btnPrimary = { ...btnBase,  };
const btnSuccess = { ...btnBase,  };
const btnDanger = { ...btnBase,  };

const resultBox = {
  marginTop: 8,
  padding: 12,
  background: '#f7f8fa',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
};
