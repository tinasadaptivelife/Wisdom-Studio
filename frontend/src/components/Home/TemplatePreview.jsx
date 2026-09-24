/* Miniature illustrations of each template, drawn as a little page sitting on
   the template's accent color. Decorative only — cards carry their own labels. */

const Page = ({ children }) => (
  <g>
    <rect x="28" y="12" width="84" height="106" rx="4" fill="#fff" />
    {children}
  </g>
);

const previews = {
  blank: (
    <Page>
      <path d="M96 12 h16 v16 z" fill="#eef2f6" />
    </Page>
  ),
  'coloring-page': (
    <Page>
      {/* line-art flower to color in */}
      <g fill="none" stroke="#5d564b" strokeWidth="2" strokeLinecap="round">
        <circle cx="70" cy="52" r="9" />
        <ellipse cx="70" cy="33" rx="7" ry="10" />
        <ellipse cx="70" cy="71" rx="7" ry="10" />
        <ellipse cx="51" cy="52" rx="10" ry="7" />
        <ellipse cx="89" cy="52" rx="10" ry="7" />
        <path d="M70 81 v22" />
        <path d="M70 92 q-12 -4 -16 4" />
      </g>
      <rect x="44" y="106" width="52" height="4" rx="2" fill="#e4dac9" />
    </Page>
  ),
  flyer: (
    <Page>
      <rect x="38" y="22" width="64" height="9" rx="3" fill="#1d3557" />
      <rect x="38" y="38" width="64" height="40" rx="3" fill="#f4a259" />
      <path d="M50 70 l12 -14 8 9 7 -8 15 13 z" fill="#fff" opacity="0.85" />
      <circle cx="52" cy="48" r="4" fill="#fff" opacity="0.85" />
      <rect x="38" y="86" width="64" height="4" rx="2" fill="#cfc2ab" />
      <rect x="38" y="95" width="48" height="4" rx="2" fill="#cfc2ab" />
      <rect x="38" y="104" width="56" height="4" rx="2" fill="#cfc2ab" />
    </Page>
  ),
  storybook: (
    <Page>
      <rect x="36" y="20" width="68" height="52" rx="3" fill="#bfdff0" />
      <circle cx="52" cy="34" r="6" fill="#fff3c4" />
      <path d="M36 62 q14 -18 28 -6 q12 -14 26 -2 l14 18 h-68 z" fill="#8fbf88" />
      <rect x="36" y="80" width="68" height="4" rx="2" fill="#cfc2ab" />
      <rect x="36" y="89" width="60" height="4" rx="2" fill="#cfc2ab" />
      <rect x="36" y="98" width="66" height="4" rx="2" fill="#cfc2ab" />
      <rect x="36" y="107" width="40" height="4" rx="2" fill="#cfc2ab" />
    </Page>
  ),
  document: (
    <Page>
      <rect x="48" y="22" width="44" height="7" rx="3" fill="#1d3557" />
      <rect x="38" y="40" width="26" height="4" rx="2" fill="#b23a48" />
      <rect x="38" y="49" width="64" height="4" rx="2" fill="#cfc2ab" />
      <rect x="38" y="58" width="56" height="4" rx="2" fill="#cfc2ab" />
      <rect x="38" y="72" width="26" height="4" rx="2" fill="#b23a48" />
      <rect x="38" y="81" width="60" height="4" rx="2" fill="#cfc2ab" />
      <rect x="38" y="90" width="50" height="4" rx="2" fill="#cfc2ab" />
      <rect x="38" y="99" width="62" height="4" rx="2" fill="#cfc2ab" />
    </Page>
  ),
  newsletter: (
    <Page>
      <rect x="34" y="20" width="72" height="9" rx="3" fill="#1d3557" />
      <rect x="34" y="33" width="72" height="4" rx="2" fill="#cfc2ab" />
      <rect x="34" y="44" width="30" height="30" rx="2" fill="#8ecae6" />
      <rect x="68" y="44" width="38" height="4" rx="2" fill="#cfc2ab" />
      <rect x="68" y="52" width="38" height="4" rx="2" fill="#cfc2ab" />
      <rect x="68" y="60" width="30" height="4" rx="2" fill="#cfc2ab" />
      <rect x="34" y="82" width="72" height="4" rx="2" fill="#cfc2ab" />
      <rect x="34" y="91" width="66" height="4" rx="2" fill="#cfc2ab" />
      <rect x="34" y="100" width="70" height="4" rx="2" fill="#cfc2ab" />
    </Page>
  ),
  workbook: (
    <Page>
      <rect x="44" y="20" width="52" height="8" rx="3" fill="#1d3557" />
      <rect x="38" y="36" width="64" height="4" rx="2" fill="#b23a48" />
      <rect x="38" y="52" width="64" height="56" rx="3" fill="#f4f1ea" stroke="#cfc2ab" strokeWidth="1.5" />
      <rect x="44" y="60" width="52" height="3" rx="1.5" fill="#d8d0bd" />
      <rect x="44" y="68" width="40" height="3" rx="1.5" fill="#d8d0bd" />
      <rect x="44" y="76" width="52" height="3" rx="1.5" fill="#d8d0bd" />
    </Page>
  ),
  certificate: (
    <Page>
      <rect x="30" y="14" width="80" height="100" rx="4" fill="none" stroke="#d4a017" strokeWidth="4" />
      <path d="M70 30 l6 12 13 2 -9.5 9 2 13 -11.5 -6 -11.5 6 2 -13 -9.5 -9 13 -2 z" fill="#d4a017" />
      <rect x="46" y="70" width="48" height="5" rx="2.5" fill="#1d3557" opacity="0.7" />
      <rect x="52" y="80" width="36" height="4" rx="2" fill="#cfc2ab" />
      <rect x="40" y="98" width="20" height="3" rx="1.5" fill="#cfc2ab" />
      <rect x="80" y="98" width="20" height="3" rx="1.5" fill="#cfc2ab" />
    </Page>
  ),
  'social-post': (
    <Page>
      <rect x="28" y="12" width="84" height="84" rx="4" fill="#ff6f91" opacity="0.3" />
      <circle cx="70" cy="54" r="20" fill="#fff" opacity="0.85" />
      <path d="M60 58 l7 -9 6 7 5 -6 9 8 h-27 z" fill="#ff6f91" opacity="0.6" />
      <rect x="44" y="102" width="52" height="5" rx="2.5" fill="#1d3557" opacity="0.7" />
      <rect x="54" y="112" width="32" height="4" rx="2" fill="#cfc2ab" />
    </Page>
  ),
  invitation: (
    <Page>
      <rect x="36" y="20" width="68" height="46" rx="3" fill="#9d4edd" opacity="0.35" />
      <path d="M36 30 l34 22 34 -22" fill="none" stroke="#9d4edd" strokeWidth="2.5" />
      <rect x="44" y="74" width="52" height="6" rx="3" fill="#1d3557" opacity="0.7" />
      <rect x="50" y="86" width="40" height="4" rx="2" fill="#cfc2ab" />
      <rect x="54" y="96" width="32" height="4" rx="2" fill="#cfc2ab" />
    </Page>
  ),
  brochure: (
    <Page>
      <rect x="38" y="20" width="64" height="8" rx="3" fill="#1d3557" />
      <rect x="38" y="36" width="64" height="38" rx="3" fill="#588157" opacity="0.4" />
      <path d="M50 66 l11 -13 8 8 6 -7 14 12 z" fill="#fff" opacity="0.85" />
      <rect x="38" y="82" width="64" height="4" rx="2" fill="#cfc2ab" />
      <rect x="38" y="91" width="56" height="4" rx="2" fill="#cfc2ab" />
      <rect x="38" y="103" width="48" height="4" rx="2" fill="#cfc2ab" />
    </Page>
  ),
  'quote-card': (
    <Page>
      <rect x="36" y="20" width="68" height="36" rx="3" fill="#f6c9b8" />
      <circle cx="50" cy="32" r="5" fill="#fff3c4" />
      <path d="M36 50 q10 -12 20 -4 q10 -10 22 -2 l6 4 h-48 z" fill="#e07a5f" opacity="0.65" />
      <rect x="44" y="66" width="52" height="5" rx="2.5" fill="#1d3557" opacity="0.7" />
      <rect x="50" y="76" width="40" height="5" rx="2.5" fill="#1d3557" opacity="0.7" />
      <rect x="58" y="92" width="24" height="4" rx="2" fill="#cfc2ab" />
    </Page>
  ),
};

// Variants of the same asset type share that type's illustration — keyed by
// typeKey, not the specific template/variant key.
export default function TemplatePreview({ typeKey, accent }) {
  return (
    <svg viewBox="0 0 140 130" className="template-preview" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="140" height="130" rx="10" fill={accent} opacity="0.28" />
      {previews[typeKey] ?? previews.blank}
    </svg>
  );
}
