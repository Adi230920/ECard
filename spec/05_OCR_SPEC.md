Use free, on-device Google ML Kit Text Recognition for business-card OCR. 
The application must capture the card image, run OCR locally, and return detected text without requiring a paid API or server. 
Parse OCR output using deterministic rules and regular expressions. 
Detect likely names, phone numbers, email addresses, websites, LinkedIn URLs, and addresses. 
Use labels and text positioning where useful for company and designation detection. 
Always show extracted information in an editable review screen before saving. 
Handle blurry images, incomplete text, unsupported formats, and OCR failures gracefully. 
Never send card images or extracted data to external services in V1.