import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

const PagerViewWeb = forwardRef((props: any, ref) => {
  const [currentPage, setCurrentPage] = useState(props.initialPage || 0);

  useImperativeHandle(ref, () => ({
    setPage: (page: number) => {
      setCurrentPage(page);
      if (props.onPageSelected) {
        props.onPageSelected({ nativeEvent: { position: page } });
      }
    },
    setPageWithoutAnimation: (page: number) => {
      setCurrentPage(page);
    }
  }));

  const children = React.Children.toArray(props.children);

  return (
    <View style={[styles.container, props.style]}>
      {children[currentPage]}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default PagerViewWeb;
