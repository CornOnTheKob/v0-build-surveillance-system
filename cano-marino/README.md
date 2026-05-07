
## Thesis Title: 
    - Cross Modal Feature Interaction for Enhancing Occluded Pedestrian Detection Using a ConvNeXt-Swin Transformer Hybrid Network

## Members: Cano, Jacob Lorenzo Atanacio; Marino, Lawrence Paul Cado (and Manabat, Jervie)

## Github Repo (for Prototype/Demo - Main Branch): https://github.com/CornOnTheKob/v0-build-surveillance-system.git

## Project Stack / Components Used

- **Frontend:** Next.js 16, React 19, TypeScript
- **UI / Styling:** Tailwind CSS 4, Radix UI, Lucide Icons, Recharts
- **Backend:** Python + FastAPI
- **Video / CV Processing:** OpenCV and Ultralytics **YOLO** tracking pipeline with **ByteTrack** configuration
- **Semantic Search:** **OpenCLIP ViT-B-32** + **FAISS** for similarity search
- **LLM-assisted Search Parsing / Ranking:** **Google Gemini 2.0 Flash API**
- **Vision Metadata Enrichment:** **Google Cloud Vision API**
- **Location Search / Autofill:** **Google Places API**
- **Storage:** local project storage / JSON-based project data

## Main Features

- **Video upload and processing**  
  Upload CCTV footage, assign it to a location, and process it for pedestrian detection and tracking. Uses **Ultralytics YOLO**, **ByteTrack**, and **OpenCV**.

- **Natural-language pedestrian search**  
  Search using descriptions like clothing color, visible text, or location. Uses **Google Gemini 2.0 Flash API** to help parse and rank search matches.

- **Semantic appearance matching**  
  Matches text queries against saved pedestrian crops from the footage. Uses **OpenCLIP ViT-B-32** and **FAISS** for text-image similarity search.

- **Jump-to-footage playback**  
  Opens the video player directly near the matched timestamp so the user can inspect the detected person in context.

- **Track thumbnails and preview snippets**  
  Saves representative pedestrian thumbnails / crops to make search results easier to inspect quickly.

- **Cloud Vision metadata enrichment**  
  Extracts helpful labels, objects, logos, and visible text from track thumbnails. Uses **Google Cloud Vision API**.

- **Location management**  
  Add and edit monitoring locations with name, address, latitude, and longitude. Place lookup uses the **Google Places API**.

- **ROI configuration**  
  Supports pedestrian walkable-area polygons so only detections inside the configured region are counted for analytics.

- **Entry / exit directional counting**  
  Supports gate-strip configuration to estimate whether pedestrians are **entering** or **exiting** based on motion direction.

- **Dashboard analytics**  
  Shows summary cards, pedestrian traffic charts, visible pedestrian trends, and occlusion-related analytics using **Recharts**.

- **PTSI / congestion monitoring**  
  Computes Pedestrian Traffic Severity Index style analytics from tracked pedestrian activity and configured walkable area / ROI data.

- **AI synthesis summary**  
  Generates a short dashboard summary from computed analytics for easier interpretation. This is generated from the app's own analytics pipeline.

- **Report export**  
  Exports dashboard results and related analytics artifacts for documentation and review.

- **Upload queue and cancellation**  
  Tracks upload progress and lets users cancel ongoing video processing jobs.

- **Custom model support**  
  The system supports selecting / uploading a detection model for backend inference, making it adaptable for thesis experiments and prototype demos.

