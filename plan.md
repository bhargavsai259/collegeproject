Roomify Project Plan

| Feature                | Module Name            | Description / Example Models                | Why Needed                                                                 |
|------------------------|-----------------------|---------------------------------------------|----------------------------------------------------------------------------|
| Depth Estimation       | Depth Estimation      | MiDaS, DPT: Estimate depth from image       | Converts 2D images into 3D depth maps for reconstructing room geometry and object positions. |
|                        | Preprocessing         | Prepare image for depth model               | Ensures images are resized/normalized for consistent model input, improving accuracy. |
| Wall Color Extraction  | Segmentation          | Mask R-CNN, DeepLab: Segment walls/floors   | Identifies and separates walls, floors, and other surfaces to extract colors accurately. |
|                        | Color Extraction      | Extract dominant colors from segments       | Preserves realistic wall/floor colors in the 3D render for visual fidelity. |
| Furniture Detection    | Object Detection      | YOLO, Faster R-CNN, Detectron2: Find items  | Locates furniture in images to place 3D models in the scene. |
|                        | Furniture Mapping     | Map detected furniture to 3D assets         | Matches detected objects to appropriate 3D models for interactive placement. |
| Multi-Room Support     | Room Alignment        | SLAM, feature matching: Connect multiple rooms | Aligns separate room images into a cohesive 3D space for navigation. |
|                        | Scene Stitching       | Combine 3D scenes from multiple images      | Merges individual room reconstructions into a single, explorable environment. |

## Project Plan

| Step | Task                          | Details / Tools Used                       | Why Needed                                                                 |
|------|-------------------------------|--------------------------------------------|----------------------------------------------------------------------------|
| 1    | Requirements & Research        | Define features, research AI models        | Establishes project scope and identifies suitable AI technologies. |
| 2    | Tech Stack Selection           | React, Three.js, Python, Flask/FastAPI     | Chooses compatible tools for frontend rendering and backend AI processing. |
| 3    | Initial Setup                  | Setup frontend/backend, AI environment     | Prepares development environments for efficient coding and testing. |
| 4    | Image Upload Module            | Frontend UI, backend file handling         | Enables users to submit images for processing. |
| 5    | Segmentation & Detection       | Integrate models, return results           | Breaks down images into components for 3D reconstruction. |
| 6    | Color Extraction               | Extract/send color data                    | Ensures visual accuracy in the 3D scene. |
| 7    | 3D Reconstruction              | Depth models, map to 3D scene              | Builds the core 3D geometry from image data. |
| 8    | 3D Rendering Frontend          | Render room, place furniture, apply colors | Displays the interactive 3D view to users. |
| 8.5  | Multi-Room Support             | Handle multiple images, detect connections, align rooms in 3D scene | Extends functionality to multi-room layouts for broader use cases. |
| 9    | Testing & Iteration            | Test images, improve accuracy              | Validates and refines the system for real-world reliability. |
| 10   | Deployment                     | Deploy backend/frontend                    | Makes the app accessible to users. |
| 11   | Documentation & Improvements   | Document, plan advanced features           | Ensures maintainability and future enhancements. |
