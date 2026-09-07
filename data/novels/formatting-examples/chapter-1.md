Images use ordinary Markdown. Here is a local image of the Folio logo:

![Folio logo: a stylized open book above the word Folio](/images/folio-logo.png)

The Markdown for this image is:

```markdown
![Folio logo: a stylized open book above the word Folio](/images/folio-logo.png)
```

The file lives at `public/images/folio-logo.png` in the application folder. The leading `/` makes the URL work from every chapter, including in a static export. Leave `public` out of the URL.

The text inside the square brackets describes the image for readers using a screen reader and appears if the image cannot load.

You can also embed an image with an HTTPS URL. Unlike this local example, a remote image needs a network connection and remains dependent on its host.

**Current limitation:** Folio does not yet have an image upload control or serve images directly from an external manuscript folder. Local web images must currently live under the application's `public/` folder. Everything in that folder is included in static exports, even if only a draft refers to it.
