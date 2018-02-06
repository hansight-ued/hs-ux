## 输入数据格式

````js
QUERY := {
  search: {
    size: 45,          // 用于分页的 size 和 from，相当于 mysql 中的 select ... limit xx offset xx 
    from: 60,       //
    colums: [ COLUM ],     // 需要返回的数据的列，相当于 mysql 中的  select COLUM_1, COLUM_2 from ... 。如果该字段不存在或为 null，表示查询全部字段。
  }
  dimensions: [AGG, AGG, AGG, ...],    // 维度(聚合)
  filter: '<HAL Filter>'
}
````

search 用于查询原始数据，如果该字段为空则不查询原始数据。

dimentions 用于查询聚合数据，如果该字段为空则不查询聚合数据。

filter 用于指定过滤条件，是 HAL 语法的过滤条件子集，如果该字段为空则不使用任何过滤条件。

查询原始数据时需要返回的字段 COLUM 数据结构:

````js
COLUM := {
  field: 'username',
  order: null,  // 'desc', 'asc' 是否排序以及排序方式。如果 order 字段不存在(或为 null)代表不排序
}
````

查询聚合数据时需要的 AGG 数据结构：

````js
AGG := METRIC_AGG or BUCKET_AGG

METRIC_AGG := {
  type: 'metric',
  field: 'bytes',  
  metric: 'SUM'    // SUM 求和，AVG 求平均，MAX, MIN ..., COUNT 求数量，DISTICT_COUNT 求不同的数量
}

BUCKET_AGG := TERM_AGG or DATE_HISTOGRAM_AGG

TERM_AGG := {
  type: 'term',
  field: 'src_ip',
  top: {
    type: 'metric', // 'metric', 'value', 'distinct_value'，当 type 是 metric 时，有以下两个字段，涵义跟 METRIC_AGG 一致
    metric: 'SUM', 
    field: 'bytes',
    value: 10,
    order: 'asc'
  }
}

DATE_HISTOGRAM_AGG := {
  type: 'date_histogram',
  field: 'timestamp',
  interval: {
    type: 'day',   // auto, year, day, month, week, minute, hour, second
    value: 1   // how many days
  }
}

````

TERM_AGG 从涵义上讲，一定会有取多少个数据（top N）的概念，相当于 sql 中的 limit。

DATE\_HISTOGRAM\_AGG 必须指定 interval，其 type 可以是从年到秒，也可以指定为 `auto`。指定为 `auto` 时，由后端根据 `filter` 中的时间范围，动态确定最佳的 interval。

dimensions 从左向向有先后关系，先聚合最左，依次再向右聚合。BUCKET\_AGG 和 METRIC\_AGG 都可以出现或不出现，但需要满足一但有 METRIC\_AGG 出现，它的右侧就不允许再有 BUCKET\_AGG 出现。

## 输出数据格式

当输入查询条件有 search 字段时，返回结果也对应有 search 字段；查询条件有 dimensions 时，返回结果对应有 aggs 字段。

````js
{
  search: SEARCH_RESULT,       // 搜索的原始数据结果
  aggs: AGGREGATION_RESULT     // 聚合结果见下面的文档
}
````

### 原始数据结果(SEARCH_RESULT)

````js
{
  total: 3232323,   // 数据总量，用于给前端分页
  data: [{                 // 实际查询的返回数据
     name: 'xiaoge',
     age: 12
  }]
}
````

### 聚合结果(AGGREGATION_RESULT)

以下数据中的 key 可能是字符串，也可能是 timestamp 一类的数字，value 一定是一个数字或 null。当维度是 date_histogram 类型的聚合时，key 代表的是 interval 的开始时间。

#### 一个 METRIC 维度

````js
{ value: 323232323 } // Single
````

#### 两个 METRIC 维度

````js
{
  value: [443434, 355454]
}
````

也就是说，连续的 N 个 METRIC 维度，最终会得到一个 N 个元素的数组，里面依次是每个聚合的结果。

#### 两个维度（分别是 BUCKET，METRIC)

````js
[{ key: 'a', value: 32323 }, { key: 32545545, value: 433434 }]
````

#### 两个维度（都是 BUCKET)

````js
[{
  key: 'a', 
  value: [{key: 'a1', value: null}, {key: 'a2', value: null}]
}, {
  key: 'b',
  value: [{key: 'b1', value: null}, {key: 'b2', value: null}]
}]
````

#### 三个维度（分别是 BUCKET，BUCKET，METRIC)

````js
[{
  key: 'a',
  value: [ {key: 'a1', value: 323232 }, { key: 'a2', value: 5454545 }]
}, {
  key: 'b',
  value: [ {key: 'b1', value: 3232323}, { key: 'b2', value: 34433434 }]
}]
````

#### 四个维度（分别是 BUCKET，BUCKET，METRIC，METRIC）

````js
[{
  key: 'a',
  value: [ {key: 'a1', value: [323, 323] }, { key: 'a2', value: [111, 222] }]
}, {
  key: 'b',
  value: [ {key: 'b1', value: [555, 666]}, { key: 'b2', value: [888, 999] }]
}]
````

#### 更多维度时，以此类推