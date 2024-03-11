package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
)

var (
	URL_DEV  = "https://hm-grunndata-search.intern.dev.nav.no/products/_search"
	URL_PROD = "https://hm-grunndata-search.intern.nav.no/products/_search"
)

func main() {
	if len(os.Args) != 3 {
		log.Fatalf("%s <prod|dev> <input-file>\n", os.Args[0])
	}

	env := strings.ToLower(os.Args[1])
	if env != "prod" && env != "dev" {
		log.Fatalf("%s <prod|dev> <input-file>\n", os.Args[0])
	}

	url := URL_DEV
	if env == "prod" {
		url = URL_PROD
	}

	infilename := os.Args[2]
	infile, err := ioutil.ReadFile(infilename)
	if err != nil {
		log.Fatalln(err)
	}

	indata := map[string][]int{}
	if err = json.Unmarshal(infile, &indata); err != nil {
		log.Fatalln(err)
	}

	outdata := map[string][]ResultRecord{}
	for sortimentKategori, apostids := range indata {
		// log.Printf("%s: %#v\n", sortimentKategori, apostids)
		for _, apostid := range apostids {
			reqBody := []byte(fmt.Sprintf(`{"query": {"bool": {"must": [{"match": {"agreements.postIdentifier": "HMDB-%d"}}]}}}`, apostid))
			resp, err := http.Post(url, "application/json", bytes.NewBuffer(reqBody))
			if err != nil {
				log.Fatalln(err)
			}
			respBody, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				log.Fatalln(err)
			}
			osResp := OSResponse{}
			if err = json.Unmarshal(respBody, &osResp); err != nil {
				log.Fatalln(err)
			}
			if _, ok := outdata[sortimentKategori]; !ok {
				outdata[sortimentKategori] = []ResultRecord{}
			}
			if len(osResp.Hits.Hits) > 0 && len(osResp.Hits.Hits[0].Source.Agreements) > 0 {
				postID := osResp.Hits.Hits[0].Source.Agreements[0].PostID
				outdata[sortimentKategori] = append(outdata[sortimentKategori], ResultRecord{
					Apostid: apostid,
					PostID:  postID,
				})
			} else {
				outdata[sortimentKategori] = append(outdata[sortimentKategori], ResultRecord{
					Apostid: apostid,
					PostID:  nil,
				})
			}
			// break
		}
		// break
	}

	outfile, err := json.Marshal(&outdata)
	if err != nil {
		log.Fatalln(err)
	}

	fmt.Printf("%s\n", outfile)
}

type OSResponse struct {
	Hits OSHits `json:"hits"`
}

type OSHits struct {
	Hits []OSHit `json:"hits"`
}

type OSHit struct {
	Source OSProduct `json:"_source"`
}

type OSProduct struct {
	Agreements []OSAgreement `json:"agreements"`
}

type OSAgreement struct {
	PostID string `json:"postId"`
}

type ResultRecord struct {
	Apostid interface{} `json:"aposid"`
	PostID  interface{} `json:"postId"`
}
