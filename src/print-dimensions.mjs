// Finished magnet face. Flat fold outlines and optional image wrap are independent.
export const MAGNET_FACE_MM=63.5;
export const MAGNET_FACE_CM=MAGNET_FACE_MM/10;
export const MAGNET_FACE_INCHES=MAGNET_FACE_MM/25.4;
export const MAGNET_SIZE_MM_TEXT=`${MAGNET_FACE_MM} × ${MAGNET_FACE_MM} mm`;
export const MAGNET_SIZE_CM_TEXT=`${MAGNET_FACE_CM} × ${MAGNET_FACE_CM} cm`;
export const PUZZLE_SIDE_CM=Object.freeze({3:MAGNET_FACE_MM*3/10,5:MAGNET_FACE_MM*5/10});
export const PRINT_TARGET_PPI=300;
export const PRINT_TARGET_SOURCE_PIXELS=MAGNET_FACE_INCHES*PRINT_TARGET_PPI;
