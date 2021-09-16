# confluence-to-google-drive-migration
Scripts to help you migrate your confluence documents to google drive

Because google drive supports viewing and editing docx files, we are gonna create those files, and upload them to google drive

1. Clone this repository
2. Export you confluence space using the method described here: https://community.atlassian.com/t5/Confluence-questions/Migrating-Data-from-confluence-to-google-Drive/qaq-p/1297000. You're supposed to get a bunch of html files including index.html.
3. Put the outputted files in a folder called "confluence-export" inside this project folder. The script will use the index.html file to understand the hirarchy of your files. 
4. Use the method getConfluencePages to generate the descriptors and hirarchy of your files.
5. Use downloadPages to download all .doc files of every page.
6. Use the method described here: https://www.extendoffice.com/documents/word/5601-word-batch-convert-doc-to-docx.html to convert all the .doc files to .docx which google docs supports. 
7. Use writeConfluencePages to arrange the files in folder properly.
8. Upload those files to google drive.

## Limitations

- Attachements that are not image will not be exported. As well as any other widget that exporting to word is not supported. 
- The script assume your confluence pages don't have "/" in their name, which is invalid in a regular file system. If that's the case - you will have to rename them befor starting the entire process. 
