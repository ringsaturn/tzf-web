package main

import (
	"encoding/json"
	"flag"
	"os"
	"strings"

	"github.com/paulmach/orb/maptile"
	tzfrellite "github.com/ringsaturn/tzf-rel-lite"
	"github.com/ringsaturn/tzf/convert"
	pb "github.com/ringsaturn/tzf/gen/go/tzf/v1"
	"github.com/tidwall/geojson"
	"github.com/tidwall/geojson/geometry"
	"google.golang.org/protobuf/proto"
)

type dataType int

const (
	dataTypePolygons dataType = iota
	dataTypeIndex
)

var (
	outputDir = flag.String("output", "output", "Output directory")
	dtype     = flag.Int("type", 0, "Type of data to generate")
)

func generatePolygons(input *pb.Timezones) {
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
	}
}

// Generate GeoJSON polygons for timezone's XYZ tile indexes
func generateIndexPolygons(input *pb.PreindexTimezones) {
	name2keys := make(map[string][]*pb.PreindexTimezone)
	for _, tzItem := range input.Keys {
		name2keys[tzItem.Name] = append(name2keys[tzItem.Name], tzItem)
	}

	_ = geojson.NewPolygon(nil)
	_ = geojson.NewFeatureCollection(nil)
	_ = geojson.NewFeature(nil, "")
	_ = &geojson.Polygon{}

	features := []*geojson.Feature{}

	for name, keys := range name2keys {
		polys := []*geometry.Poly{}
		for _, key := range keys {
			tile := maptile.New(uint32(key.X), uint32(key.Y), maptile.Zoom(key.Z))
			bound := tile.Bound()
			minP := bound.Min
			maxP := bound.Max

			_poly := geometry.NewPoly(
				[]geometry.Point{
					{X: minP.Lon(), Y: minP.Lat()},
					{X: maxP.Lon(), Y: minP.Lat()},
					{X: maxP.Lon(), Y: maxP.Lat()},
					{X: minP.Lon(), Y: maxP.Lat()},
					{X: minP.Lon(), Y: minP.Lat()},
				},
				[][]geometry.Point{},
				nil,
			)
			polys = append(polys, _poly)
		}

		polygon := geojson.NewMultiPolygon(polys)
		properties := map[string]any{
			"properties": map[string]any{
				"name": name,
			},
		}
		propertiesBytes, err := json.Marshal(properties)
		if err != nil {
			panic(err)
		}
		feature := geojson.NewFeature(polygon, string(propertiesBytes))
		features = append(features, feature)

		safeTzName := strings.Replace(name, "/", "-", -1)
		filename := *outputDir + "/" + safeTzName + ".geojson"

		featureStr := feature.String()

		if err := os.WriteFile(filename, []byte(featureStr), 0644); err != nil {
			panic(err)
		}
	}

	output := map[string]any{
		"type":     "FeatureCollection",
		"features": features,
	}

	outputBytes, err := json.Marshal(output)
	if err != nil {
		panic(err)
	}
	if err := os.WriteFile(*outputDir+"/"+"_all"+".geojson", outputBytes, 0644); err != nil {
		panic(err)
	}
}

func main() {
	flag.Parse()

	// if *dataType(dtype) == dataTypePolygons {
	// 	input := &pb.Timezones{}
	// 	if err := proto.Unmarshal(tzfrellite.LiteData, input); err != nil {
	// 		panic(err)
	// 	}
	// }

	if *dtype == int(dataTypePolygons) {
		input := &pb.Timezones{}
		if err := proto.Unmarshal(tzfrellite.LiteData, input); err != nil {
			panic(err)
		}
		generatePolygons(input)
	}

	if *dtype == int(dataTypeIndex) {
		input := &pb.PreindexTimezones{}
		if err := proto.Unmarshal(tzfrellite.PreindexData, input); err != nil {
			panic(err)
		}
		generateIndexPolygons(input)
	}
}
