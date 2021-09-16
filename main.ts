import {MakeDirectoryOptions, Mode, PathLike, PathOrFileDescriptor, WriteFileOptions} from "fs";
import axios from 'axios';
const fs = require('fs');
const ncp = require('ncp');
const http = require('http');
import {HTMLElement, parse} from 'node-html-parser';
import * as _ from "lodash";

interface IConfluencePage {
    name: string;
    id: string;
    file: string;
    children: IConfluencePage[] | null;
}

async function readFile(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readFile(file, 'utf8', (err, data) => {
            if (data) {
                resolve(data);
            } else {
                reject(err);
            }
        })
    })
}

async function writeFile(file: PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView, options: WriteFileOptions = 'utf8'): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, options, (err) => {
            if (!err) {
                resolve();
            } else {
                reject(err);
            }
        })
    })
}

async function mkdir(path: PathLike, options: Mode | MakeDirectoryOptions | null | undefined = null): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, options, (err) => {
            if (!err) {
                resolve();
            } else {
                reject(err);
            }
        })
    })
}

async function getConfluencePages(): Promise<IConfluencePage[]> {
    const file: string = await readFile('confluence-export/index.html');
    const parsedHtml: HTMLElement = parse(file);
    const rootUlElement = parsedHtml.querySelector('ul');

    return parseList(rootUlElement, 0).children;

    function parseList(ulElement: HTMLElement, index: number): IConfluencePage {
        // every ulElement has a single child li element. This li element might contain 0 or multiple ulElements.
        // @ts-ignore
        const liElement: HTMLElement = ulElement.childNodes.filter(node => node instanceof HTMLElement)[0];
        const anchorElement: HTMLElement = liElement.querySelector('a');
        // @ts-ignore
        let innerUlElementList: HTMLElement[] = liElement.childNodes.filter(node => node instanceof HTMLElement && node.rawTagName === 'ul');
        return {
            name: `${index + 1}. ${anchorElement.innerText.trim()}`,
            id: _.last(anchorElement.getAttribute('href').split('_')).split('.')[0],
            file: anchorElement.getAttribute('href'),
            children: !!innerUlElementList && !!innerUlElementList.length ? innerUlElementList.map((element: HTMLElement, index: number) => parseList(element, index)) : null,
        }
    }
}

function removeElement(htmlElementToRemove: HTMLElement) {
    htmlElementToRemove.parentNode.removeChild(htmlElementToRemove);
}

function removeElementByQuery(htmlElement: HTMLElement, query: string): void {
    const element = htmlElement.querySelector(query);
    if (!element) {
        return;
    }
    removeElement(element);
}

function writeConfluencePages(confluencePages: IConfluencePage[], path: string = 'output', depth = 0): void {
    console.log(path);
    for (let confluencePage of confluencePages) {
        if (!confluencePage.children) {
            try {
                const file = fs.readFileSync(`downloaded-pages/${confluencePage.file.split('.')[0]}.docx`);
                // const parsedHTML: HTMLElement = parse(file);
                // removeElementByQuery(parsedHTML, '#footer');
                // removeElementByQuery(parsedHTML, '#main-header');
                // removeElementByQuery(parsedHTML, '.page-metadata');
                // removeElementByQuery(parsedHTML, '.pageSection');
                // if (depth > 0) {
                //     const imgElementList = parsedHTML.querySelectorAll('img');
                //     for (let imgElement of imgElementList) {
                //         const src = imgElement.getAttribute('src');
                //         imgElement.setAttribute('src', '../'.repeat(depth - 1) + src);
                //     }
                // }

                const pathToFile: string[] = `${path}/${confluencePage.name}`.split('/');
                const fileName: string = pathToFile.pop();
                const pathToFileContainingFolder = pathToFile.join('/');
                if (!fs.existsSync(pathToFileContainingFolder)){
                    fs.mkdirSync(pathToFileContainingFolder, {recursive: true});
                }
                // todo: files that ended with number did not get the html postfix.
                fs.writeFileSync(`${__dirname}/${pathToFileContainingFolder}/${fileName}.docx`, file);
            } catch(err) {
                console.error(err);
            }
        } else {
            writeConfluencePages([
                {
                    name: confluencePage.name,
                    file: confluencePage.file,
                    id: confluencePage.id,
                    children: null,
                },
                ...confluencePage.children,
            ], `${path}/${confluencePage.name}`, depth++)
        }
    }
}

async function downloadPage(confluencePage: IConfluencePage): Promise<void> {
    console.log('downloading page', confluencePage.name);
    try {
        const data = (await axios.get(
            `https://harshuv.atlassian.net/wiki/exportword?pageId=${confluencePage.id}`,
            {
                headers: {
                    authority: 'harshuv.atlassian.net',
                    cookie: 'confluence.browse.space.cookie=space-templates; atl.xsrf.token=71775be629427083813f053779f9f9a99b433e6e; confluence.last-web-item-clicked=system.space.tools/contenttools/export; JSESSIONID=2D750B5A7C3CA17C1C183DF95A1F0414; ajs_group_id=null; ajs_anonymous_id="863699d8-270e-4c99-86cf-908cf6a8b6b7"; atlassian.xsrf.token=f0efcbe1-3ed9-41b3-a772-2411bb486442_d242e229f52da0c05b74bb0c83608069219dc4fc_lin; cloud.session.token=eyJraWQiOiJzZXNzaW9uLXNlcnZpY2VcL3Byb2QtMTU5Mjg1ODM5NCIsImFsZyI6IlJTMjU2In0.eyJhc3NvY2lhdGlvbnMiOltdLCJzdWIiOiI1ZGFjZDRkZmJiNTlkODBkODhlYWNmNmYiLCJlbWFpbERvbWFpbiI6ImdtYWlsLmNvbSIsImltcGVyc29uYXRpb24iOltdLCJjcmVhdGVkIjoxNjMwMzUyNjUwLCJyZWZyZXNoVGltZW91dCI6MTYzMTc5NjEyOSwidmVyaWZpZWQiOnRydWUsImlzcyI6InNlc3Npb24tc2VydmljZSIsInNlc3Npb25JZCI6ImI5ZjRkMzgzLTFmZGYtNDZhMi05NjM5LWRkYzBlMTYwZDMwNCIsImF1ZCI6ImF0bGFzc2lhbiIsIm5iZiI6MTYzMTc5NTUyOSwiZXhwIjoxNjM0Mzg3NTI5LCJpYXQiOjE2MzE3OTU1MjksImVtYWlsIjoic2hhY2hhci5oYXJzaHV2QGdtYWlsLmNvbSIsImp0aSI6ImI5ZjRkMzgzLTFmZGYtNDZhMi05NjM5LWRkYzBlMTYwZDMwNCJ9.w_kDm5DQim7WCrTt0_yOoHpf8JQd2ve_GHAPiE9McWGAAS7K-UeVg14vn_WN4f9liP_KB61fti161ZJzboHQ7jBYT6xvTIO--OJPpanac2IsBVheKx8L49yTPf3rSeW7rjpofGMzDJiME7TYPqXMJ9rYSBzNL7XZs1dNLs1Cmhf80pqT-TBZxjV5ipEaQWm9C8RuGiu9B824a6tI72Z9aXQ77MwIWoREYtI-9rFjaA3OllxCjS4eYIq0Prlo1Wz208lYOZ2y4mpUXL4dwLkamaiLYZnOl9HmtgeyYkM2qhq0MKjdaZDy5zTOrBTgqYXvLlemjtVwnp5byluMIctGpg',
                },
                // params: params.queryParams, // todo: make query params work
            },
        )).data

        fs.writeFileSync(`downloaded-pages/${confluencePage.file.split('.')[0]}.doc`, data);
    } catch (e) {
        console.error(`Failed for ${confluencePage.id}`);
    }
}

async function downloadPages(confluencePageList: IConfluencePage[]): Promise<void> {
    for (let page of confluencePageList) {
        await downloadPage(page);
        if (page.children) {
            await downloadPages(page.children);
        }
    }
}

(async () => {
    fs.rmdirSync('output', {recursive: true});
    const confluencePages = await getConfluencePages();
    // await writeConfluencePages(confluencePages);
    // await new Promise<void>((resolve, reject) => ncp('confluence-export/attachments', 'output/attachments', err => {
    //    if (!err) {
    //        resolve();
    //    }  else {
    //        reject(err);
    //    }
    // }));
    // await downloadPages(confluencePages);
    await writeConfluencePages(confluencePages);

    console.log('completed'); // todo
})();