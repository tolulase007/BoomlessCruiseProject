# Boomless Cruise Simulation - Web Application

Interactive visualization tool for analyzing Mach cutoff conditions in supersonic flight. This application allows users to explore when sonic booms can be eliminated through altitude-velocity optimization.

## Features

- **Real-time Physics Simulation**: Pure client-side TypeScript implementation of supersonic flight physics
- **Interactive Controls**: Adjust atmospheric conditions, altitude ranges, and gas properties with responsive sliders
- **Beautiful Visualization**: Plotly-powered interactive contour plots showing three flight regimes:
  - Subsonic region (grey)
  - Boomless feasible region (green) - Mach cutoff satisfied
  - Loud supersonic region (white)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Embeddable**: Perfect for iframe embedding in Wix, Google Sites, or any web platform

## Physics Model

The simulation computes three flight regimes over an altitude-velocity grid:

- **Temperature Profile**: `T(h) = T_ground - lapse_rate × h + correction`
- **Speed of Sound**: `c(T) = √(γ × R × T)`
- **Subsonic**: `V < c(h)`
- **Boomless Feasible**: `c(h) < V < c_ground` (Mach cutoff condition)
- **Loud Supersonic**: `V > c_ground`

## Technology Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: Custom shadcn/ui-style components
- **Styling**: Tailwind CSS
- **Visualization**: Plotly.js
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
cd boomless-web
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

### Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment

### Deploy to Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts to link your project and deploy.

For continuous deployment, connect your GitHub repository to Vercel for automatic deployments on every push.

### Deploy to Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Deploy:
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Embedding in Wix or Google Sites

After deployment, embed using an iframe:

```html
<iframe 
  src="https://your-deployment-url.vercel.app" 
  width="100%" 
  height="900px" 
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen>
</iframe>
```

## Project Structure

```
boomless-web/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   │   ├── Card.tsx
│   │   │   ├── Slider.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Label.tsx
│   │   ├── ControlsPanel.tsx  # Parameter controls
│   │   └── PlotCanvas.tsx     # Plotly visualization
│   ├── physics.ts           # Core physics engine
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── vercel.json             # Vercel deployment config
└── package.json            # Dependencies and scripts
```

## Parameters

### Visualization Range
- **Max Altitude**: 5-30 km
- **Min/Max Velocity**: 200-450 m/s

### Atmospheric Conditions
- **Ground Temperature**: -20 to 40°C
- **Reference Altitude Temperature**: -70 to -30°C
- **Reference Altitude**: 5-15 km
- **Lapse Rate**: 4-10°C/km

### Gas Properties
- **Adiabatic Index (γ)**: Default 1.4 (air)
- **Specific Gas Constant (R)**: Default 287 J/(kg·K) (air)

## Performance

- Grid computation: ~50ms for 400×400 points (160k grid cells)
- Real-time updates as sliders move (no artificial debouncing needed)
- Optimized with React useMemo for efficient re-rendering

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

ISC

## Credits

Based on the Python implementation by [Your Name]. Converted to an interactive web application for public access and educational purposes.
