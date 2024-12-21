package main

import (
	"encoding/json"
	"flag"
	"os"
	"os/exec"
	"strings"

	tzfrellite "github.com/ringsaturn/tzf-rel-lite"
	"github.com/ringsaturn/tzf/convert"
	"github.com/ringsaturn/tzf/pb"
	"google.golang.org/protobuf/proto"
)

var (
	outputDir = flag.String("output", "output", "Output directory")
	mvtDir    = flag.String("mvt", "mvt", "Output directory")
)

func main() {
	flag.Parse()

	input := &pb.Timezones{}
	if err := proto.Unmarshal(tzfrellite.LiteData, input); err != nil {
		panic(err)
	}

	if err := os.MkdirAll(*outputDir, 0755); err != nil {
		panic(err)
	}
	if err := os.MkdirAll(*mvtDir, 0755); err != nil {
		panic(err)
	}

	// Generate GeoJSON polygons
	for _, tzItem := range input.Timezones {
		feature := convert.RevertItem(tzItem)
		jsonBytes, err := json.Marshal(feature)
		if err != nil {
			panic(err)
		}

		safeTzName := strings.Replace(tzItem.Name, "/", "-", -1)
		filename := *outputDir + "/" + safeTzName + ".geojson"

		if err := os.WriteFile(filename, jsonBytes, 0644); err != nil {
			panic(err)
		}

		tzMvt := *mvtDir + "/" + safeTzName
		if err := os.MkdirAll(tzMvt, 0755); err != nil {
			panic(err)
		}

		cmd := exec.Command("tippecanoe", "--output-to-directory", tzMvt, "--minimum-zoom=0", "--maximum-zoom=5", filename)
		if err := cmd.Run(); err != nil {
			panic(err)
		}
	}
}
