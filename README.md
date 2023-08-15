# digihot-sortiment

## isokategorier.json
Brukes til å sette `kortnavn` i grunndata-api. Dette brukes videre i hm-soknadsbehandling til å generere dokumentbeskrivelse til PDFen som sendes til Joark (og vil vises i Gosys)

## produkttype
Vil på sikt bli erstattet av info direkte fra grunndata. Brukes til å klassifisere produkttype for enkelte hjelpemidler, f.eks. for å unngå at hovedprodukter legges til som tilbehør

## tilbehor_per_rammeavtale_og_leverandor.json
Midlertidig datagrunnlag for å filtrere hvilke tilbehlør forslagsmotoren skal vise.  
Format: `rammeavtaleId -> leverandørId -> [tilbehør hmsnr]`  
Kode for å generere listen finnes [her](https://github.com/navikt/hm-utils/tree/main/rammeavtale-tilbehor-parser)
