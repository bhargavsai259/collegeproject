Roomify Project Plan

| Feature                | Module Name            | Description / Example Models                | Why Needed                                                                 |
|------------------------|-----------------------|---------------------------------------------|----------------------------------------------------------------------------|
| Dimension Estimation   | Dimension Estimation  | Basic image analysis: Estimate room size    | Provides width, height, depth for rectangular rooms from image proportions. |
|                        | Preprocessing         | Prepare image for analysis                  | Ensures images are resized/normalized for consistent processing.           |
| Wall Color Extraction  | Segmentation          | Mask R-CNN, DeepLab: Segment walls          | Identifies walls to extract dominant colors for rectangular room surfaces. |
|                        | Color Extraction      | Extract dominant colors from segments       | Applies colors to walls in the 3D render for visual fidelity.              |
| Furniture Detection    | Object Detection      | YOLO, Faster R-CNN, Detectron2: Find items  | Locates furniture in images for placement in 3D scene.                     |
|                        | Furniture Mapping     | Map detected furniture to types             | Assigns categories (e.g., chair) for 3D placement.                         |
| Multi-Room Support     | Separate Room Handling| Process images independently                | Creates separate rectangular rooms, positioned side by side for user adjustment. |
| 3D Export              | Scene Export          | Export 3D scene to GLTF format              | Allows users to save/download the 3D model for external use or sharing.    |

## Project Plan

| Step | Task                          | Details / Tools Used                       | Why Needed                                                                 |
|------|-------------------------------|--------------------------------------------|----------------------------------------------------------------------------|
| 1    | Requirements & Research        | Define features, research AI models        | Establishes project scope and identifies suitable AI technologies.         |
| 2    | Tech Stack Selection           | React, Three.js, Python, Flask/FastAPI     | Chooses compatible tools for frontend rendering and backend AI processing. |
| 3    | Initial Setup                  | Setup frontend/backend, AI environment     | Prepares development environments for efficient coding and testing.        |
| 4    | Image Upload Module            | Frontend UI, backend file handling         | Enables users to submit images for processing.                             |
| 5    | Segmentation & Detection       | Integrate models, return results           | Breaks down images into components for room analysis.                      |
| 6    | Color & Dimension Extraction   | Extract color and size data                | Provides data for rectangular rooms and wall colors.                       |
| 7    | 3D Reconstruction              | Build rectangular rooms from dimensions    | Creates simple 3D boxes for rooms with colors and furniture.               |
| 8    | 3D Rendering Frontend          | Render rooms, place furniture, apply colors| Displays interactive 3D view with user-draggable rooms.                    |
| 8.5  | Multi-Room Support             | Handle multiple images as separate rooms   | Positions rooms side by side; users drag to connect/arrange.               |
| 8.6  | 3D Export                      | Add GLTF export for 3D scene               | Enables users to download the 3D model in GLTF format for external use.    |
| 9    | Testing & Iteration            | Test images, improve accuracy              | Validates and refines the system for real-world reliability.               |
| 10   | Deployment                     | Deploy backend/frontend                    | Makes the app accessible to users.                                        |
| 11   | Documentation & Improvements   | Document, plan advanced features           | Ensures maintainability and future enhancements.                           |
